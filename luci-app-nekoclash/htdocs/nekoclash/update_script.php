<?php
$repo_owner = "Thaolga";
$repo_name = "luci-app-nekoclash";
$package_name = "luci-app-nekoclash";

$api_url = "https://api.github.com/repos/$repo_owner/$repo_name/releases/latest";
$local_api_response = "/tmp/api_response.json";

$curl_command = "curl -H 'User-Agent: PHP' -s " . escapeshellarg($api_url) . " -o " . escapeshellarg($local_api_response);
exec($curl_command . " 2>&1", $output, $return_var);

if (!file_exists($local_api_response)) {
    die("Unable to access GitHub API. Please check the URL or network connection. Output: " . implode("\n", $output));
}

$response = file_get_contents($local_api_response);
$data = json_decode($response, true);
unlink($local_api_response);

$new_version = $data['tag_name'] ?? '';

if (empty($new_version)) {
    die("Latest version not found or version information is empty.");
}

$installed_package_info = shell_exec("opkg status " . escapeshellarg($package_name));
$installed_lang = 'en'; 

if (strpos($installed_package_info, '-cn') !== false) {
    $installed_lang = 'cn'; 
} elseif (strpos($installed_package_info, '-en') !== false) {
    $installed_lang = 'en';
}

$download_url = "https://github.com/$repo_owner/$repo_name/releases/download/$new_version/{$package_name}_{$new_version}-{$installed_lang}_all.ipk";

echo "<pre>Latest version: $new_version</pre>";
echo "<pre>Download URL: $download_url</pre>";
echo "<pre id='logOutput'></pre>";

echo "<script>
        function appendLog(message) {
            document.getElementById('logOutput').innerHTML += message + '\\n';
        }
      </script>";

echo "<script>appendLog('Starting update download...');</script>";

$local_file = "/tmp/{$package_name}_{$new_version}-{$installed_lang}_all.ipk";
$curl_command = "curl -sL " . escapeshellarg($download_url) . " -o " . escapeshellarg($local_file);
exec($curl_command . " 2>&1", $output, $return_var);

if ($return_var !== 0 || !file_exists($local_file)) {
    echo "<pre>Download failed. Command output: " . implode("\n", $output) . "</pre>";
    die("Download failed. Unable to find the downloaded file.");
}

echo "<script>appendLog('Download complete.');</script>";

$output = shell_exec("opkg install --force-reinstall " . escapeshellarg($local_file));
echo "<pre>$output</pre>";
echo "<script>appendLog('Installation complete.');</script>";

unlink($local_file);
?>
