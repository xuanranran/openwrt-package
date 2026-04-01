module YAML
  class << self
    alias_method :load, :unsafe_load if YAML.respond_to? :unsafe_load
    alias_method :original_dump, :dump
    alias_method :original_load_file, :load_file
  end

  def self.LOG(info)
    puts Time.new.strftime("%Y-%m-%d %H:%M:%S") + " [Info] " + "#{info}"
  end

  def self.LOG_ERROR(info)
    puts Time.new.strftime("%Y-%m-%d %H:%M:%S") + " [Error] " + "#{info}"
  end

  def self.LOG_WARN(info)
    puts Time.new.strftime("%Y-%m-%d %H:%M:%S") + " [Warning] " + "#{info}"
  end

  def self.LOG_TIP(info)
    puts Time.new.strftime("%Y-%m-%d %H:%M:%S") + " [Tip] " + "#{info}"
  end

  # Keep `short-id` as string before YAML parsing so leading zeros are preserved.
  # This is required for REALITY short-id values like `00000000`.
  def self.load_file(filename, *args, **kwargs)
    yaml_content = File.read(filename)
    processed_content = fix_short_id_quotes(yaml_content)

    if kwargs.empty?
      load(processed_content, *args)
    else
      load(processed_content, *args, **kwargs)
    end
  end

  def self.dump(obj, io = nil, **options)
    begin
      if io.nil?
        yaml_content = original_dump(obj, **options)
        fix_short_id_quotes(yaml_content)
      elsif io.respond_to?(:write)
        require 'stringio'
        temp_io = StringIO.new
        original_dump(obj, temp_io, **options)
        yaml_content = temp_io.string
        processed_content = fix_short_id_quotes(yaml_content)
        io.write(processed_content)
        io
      else
        yaml_content = original_dump(obj, io, **options)
        fix_short_id_quotes(yaml_content)
      end
    rescue => e
      LOG_ERROR("Write file failed:【%s】" % [e.message])
      nil
    end
  end

  private

  SHORT_ID_REGEX = /^(\s*)short-id:\s*(.*)$/
  LIST_ITEM_REGEX = /^(\s*)-\s*(.*)$/
  KEY_REGEX = /^(\s*)([a-zA-Z0-9_-]+):\s*(.*)$/
  QUOTED_VALUE_REGEX = /^(["'].*["']|null)$/

  # Inline map support, e.g. reality-opts: { ..., short-id: 00000000 }
  INLINE_SHORT_ID_REGEX = /(short-id:\s*)(?!["'\[]|null)([^\s,"'{}\[\]\n\r]+)(?=\s*(?:[,}\]\n\r]|$))/m.freeze

  def self.fix_short_id_quotes(yaml_content)
    return yaml_content unless yaml_content.include?('short-id:')

    begin
      # First, normalize inline-map style unquoted short-id.
      processed = yaml_content.gsub(INLINE_SHORT_ID_REGEX) do
        "#{$1}\"#{$2}\""
      end

      lines = processed.lines
      short_id_indices = lines.each_index.select { |i| lines[i] =~ SHORT_ID_REGEX }
      short_id_indices.each do |short_id_index|
        line = lines[short_id_index]
        if line =~ SHORT_ID_REGEX
          indent = $1
          value = $2.strip
          if value.empty?
            (short_id_index + 1...lines.size).each do |i|
              line = lines[i]
              next if line.strip.empty?
              if line[/^\s*/].length <= indent.length
                break
              end
              if line =~ LIST_ITEM_REGEX
                indent = $1
                value = $2.strip
                if value =~ KEY_REGEX
                  break
                end
                if value !~ QUOTED_VALUE_REGEX
                  lines[i] = "#{indent}- \"#{value}\"\n"
                end
              elsif line =~ KEY_REGEX
                break
              end
            end
          else
            if value !~ QUOTED_VALUE_REGEX
              lines[short_id_index] = "#{indent}short-id: \"#{value}\"\n"
            end
          end
        end
      end
      lines.join
    rescue => e
      LOG_ERROR("Fix short-id values type failed:【%s】" % [e.message])
      yaml_content
    end
  end

  def self.overwrite(base, override)
    return override if base.nil?
    return base if override.nil?

    begin
      case override
      when Hash
        result = base.is_a?(Hash) ? base.dup : {}

        override.each do |key, value|
          processed_key, operation = parse_key(key)

          case operation
          when :force_overwrite
            result[processed_key] = value
          when :prepend_array
            if result[processed_key].is_a?(Array) && value.is_a?(Array)
              result[processed_key] = value + result[processed_key]
            else
              result[processed_key] = value
            end
          when :append_array
            if result[processed_key].is_a?(Array) && value.is_a?(Array)
              result[processed_key] = result[processed_key] + value
            else
              result[processed_key] = value
            end
          when :batch_update
            result[processed_key] = batch_update_items(result[processed_key], value)
          when :merge
            if result[processed_key].is_a?(Hash) && value.is_a?(Hash)
              result[processed_key] = overwrite(result[processed_key], value)
            else
              result[processed_key] = value
            end
          end
        end
        result
      when Array
        override
      else
        override
      end
    rescue => e
      LOG_ERROR("YAML overwrite failed:【key: %s, operation: %s, error: %s】" % [key, operation, e.message])
      base
    end
  end

  private

  def self.parse_key(key)
    key_str = key.to_s

    # 检查是否用 <>
    if key_str.start_with?('<') && key_str.include?('>')
      close_idx = key_str.index('>')
      inner_key = key_str[1...close_idx]
      suffix = key_str[(close_idx + 1)..-1]
      
      operation = determine_operation(suffix)
      return inner_key, operation
    end

    if key_str.start_with?('+')
      return key_str[1..-1], :prepend_array
    elsif key_str.end_with?('+')
      return key_str[0...-1], :append_array
    elsif key_str.end_with?('!')
      return key_str[0...-1], :force_overwrite
    elsif key_str.end_with?('*')
      return key_str[0...-1], :batch_update
    end

    [key_str, :merge]
  end

  def self.determine_operation(suffix)
    case suffix
    when '+'
      :append_array
    when '!'
      :force_overwrite
    when '*'
      :batch_update
    when '+!', '!+'
      :force_overwrite
    when ''
      :merge
    else
      :merge
    end
  end

  def self.match_value(target, condition)
    return false if target.nil? || condition.nil?
    
    begin
      if condition.is_a?(String) && condition.start_with?('/') && condition.end_with?('/')
        pattern = condition[1...-1]
        regexp = Regexp.new(pattern)
        target.to_s =~ regexp
      else
        target == condition
      end
    rescue => e
      LOG_ERROR("YAML overwrite failed:【(match value) => target: %s, condition: %s, error: %s】" % [target, condition, e.message])
      false
    end
  end

  def self.deep_dup(obj)
    case obj
    when Array
      obj.map { |x| deep_dup(x) }
    when Hash
      obj.transform_values { |v| deep_dup(v) }
    else
      obj.dup rescue obj
    end
  end

  def self.batch_update_items(collection, update_spec)
    return collection unless update_spec.is_a?(Hash)

    begin
      where_conditions = update_spec['where'] || {}
      set_values = update_spec['set'] || {}

      if collection.is_a?(Array)
        result = collection.dup
        result.each_with_index do |item, index|
          match = false

          if item.is_a?(Hash)
            match = where_conditions.all? do |k, v|
              match_value(item[k] || item[k.to_s], v)
            end
          elsif item.is_a?(String) && where_conditions.key?('value')
            match = match_value(item, where_conditions['value'])
          end

          if match
            if item.is_a?(Hash)
              set_values.each do |k, v|
                if v.nil?
                  item.delete(k)
                else
                  item[k] = deep_dup(v)
                end
              end
            elsif item.is_a?(String) && set_values.key?('value')
              new_value = set_values['value']
              if new_value.nil?
                result.delete_at(index)
              else
                result[index] = deep_dup(new_value)
              end
            end
          end
        end
        result
      elsif collection.is_a?(Hash)
        result = collection.dup
        keys_to_delete = []

        result.each do |key, value|
          next unless value.is_a?(Hash)

          match = where_conditions.all? do |k, v|
            if k == 'key'
              match_value(key, v)
            else
              match_value(value[k] || value[k.to_s], v)
            end
          end

          if match
            if set_values.key?('key') && set_values['key'].nil?
              keys_to_delete << key
            else
              set_values.each do |k, v|
                if v.nil?
                  value.delete(k)
                else
                  value[k] = deep_dup(v)
                end
              end
            end
          end
        end

        keys_to_delete.each { |k| result.delete(k) }
        result
      else
        collection
      end
    rescue => e
      LOG_ERROR("YAML overwrite failed:【(batch update) => update_spec: %s, error: %s】" % [update_spec, e.message])
      collection
    end
  end
end