#!/bin/sh

ALL=$(bluetoothctl devices)
PAIRED=$(bluetoothctl devices Paired)
BONDED=$(bluetoothctl devices Bonded)
CONNECTED=$(bluetoothctl devices Connected)

in_list() {
    echo "$1" | grep -q "$2"
}

get_bluealsa_info() {
    local mac="$1"
    local bluealsa_mac=$(echo "$mac" | tr ':' '_')
    local bluealsa_path="/org/bluealsa/hci0/dev_${bluealsa_mac}/a2dpsrc/sink"

    if output=$(bluealsactl info "$bluealsa_path" 2>/dev/null); then
        echo "$output" | awk '
        function add_json_field(key, value, is_string) {
            if (is_string) {
                gsub(/"/, "\\\"", value);
                value = "\"" value "\"";
            }
            json_fields[length(json_fields)] = sprintf("        \"%s\": %s", key, value);
        }

        BEGIN { FS = ":" }

        /^(Sequence|Channels)/{ add_json_field(tolower($1), trim($2), 0) }
        /^(Running|SoftVolume)/{ add_json_field(tolower($1), tolower(trim($2)), 0) }
        /^(Transport|Mode|Format)/{ add_json_field(tolower($1), trim($2), 1) }

        /^(ChannelMap|Rate|Available codecs|Selected codec|Delay|ClientDelay|Volume|Mute)/ {
            key = $1;
            value = substr($0, length(key) + 2);
            value = trim(value);

            if (key == "Available codecs") key = "availableCodecs";
            else if (key == "Selected codec") key = "selectedCodec";
            else if (key == "ClientDelay") key = "clientDelay";
            else key = tolower(key);

            add_json_field(key, value, 1);
        }

        function trim(s) {
            sub(/^[ \t\r\n]+/, "", s);
            sub(/[ \t\r\n]+$/, "", s);
            return s;
        }

        END {
            if (length(json_fields) > 0) {
                printf "      \"bluealsa\": {\n";
                for (i = 0; i < length(json_fields); i++) {
                    printf "%s%s\n", json_fields[i], (i < length(json_fields) - 1) ? "," : "";
                }
                printf "      }";
            }
        }'
    else
        echo ""
    fi
}

echo "{"
echo '  "devices": ['

first=1

echo "$ALL" | grep "^Device" | while read -r line; do
    mac=$(echo "$line" | awk '{print $2}')
    name=$(echo "$line" | cut -d' ' -f3-)

    paired=false
    bonded=false
    connected=false

    in_list "$PAIRED" "$mac" && paired=true
    in_list "$BONDED" "$mac" && bonded=true
    in_list "$CONNECTED" "$mac" && connected=true

    if [ $first -eq 0 ]; then
        echo ","
    fi
    first=0

    printf '    {\n'
    printf '      "mac": "%s",\n' "$mac"
    printf '      "name": "%s",\n' "$name"
    printf '      "paired": %s,\n' "$paired"
    printf '      "bonded": %s,\n' "$bonded"
    printf '      "connected": %s' "$connected"

    if [ "$connected" = "true" ]; then
        bluealsa_info=$(get_bluealsa_info "$mac")
        if [ -n "$bluealsa_info" ]; then
            echo ","
            echo "$bluealsa_info"
        else
            echo ""
        fi
    else
        echo ""
    fi

    printf '    }'
done

echo ""
echo '  ]'
echo "}"
