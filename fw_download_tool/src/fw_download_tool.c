/***************************************************************************
 *
 *  OpenWrt OTA lightweight downloader - by sbwml
 *
 ***************************************************************************/

#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

static int progressCallback(void *clientp, double dltotal, double dlnow, double ultotal, double ulnow)
{
    double progress = 0.0;
    if (dltotal > 0.0)
    {
        progress = (dlnow / dltotal) * 100.0;
    }

    printf("%.2f%%\r", progress);
    fflush(stdout);

    return 0;
}

long parseTimeout(const char *timeoutStr)
{
    long timeout = 0;
    int len = strlen(timeoutStr);
    if (len > 1)
    {
        char unit = timeoutStr[len - 1];
        char *endptr;
        long value = strtol(timeoutStr, &endptr, 10);
        if (endptr == timeoutStr)
        {
            fprintf(stderr, "Invalid timeout value: %s\n", timeoutStr);
            return -1;
        }

        switch (unit)
        {
        case 's':
            timeout = value;
            break;
        case 'm':
            timeout = value * 60;
            break;
        case 'h':
            timeout = value * 60 * 60;
            break;
        case 'd':
            timeout = value * 60 * 60 * 24;
            break;
        default:
            fprintf(stderr, "Invalid timeout unit: %c\n", unit);
            return -1;
        }
    }
    else
    {
        timeout = strtol(timeoutStr, NULL, 10);
    }

    return timeout;
}

int downloadFile(const char *url, const char *outputPath, const char *userAgent, long timeout, int skipSSL, int followRedirects, int useIPv4, int useIPv6)
{
    CURL *curl;
    CURLcode res;

    FILE *fp;

    curl = curl_easy_init();
    if (curl)
    {
        fp = fopen(outputPath, "wb");
        if (fp == NULL)
        {
            fprintf(stderr, "Failed to open file for writing\n");
            return 1;
        }

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, NULL);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
        curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
        curl_easy_setopt(curl, CURLOPT_PROGRESSFUNCTION, progressCallback);
        curl_easy_setopt(curl, CURLOPT_PROGRESSDATA, NULL);

        curl_easy_setopt(curl, CURLOPT_USERAGENT, userAgent);
        curl_easy_setopt(curl, CURLOPT_FAILONERROR, 1L);

        if (timeout > 0)
        {
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);
        }

        if (skipSSL)
        {
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        }

        if (followRedirects)
        {
            curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        }

        if (useIPv4)
        {
            curl_easy_setopt(curl, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }
        else if (useIPv6)
        {
            curl_easy_setopt(curl, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V6);
        }

        res = curl_easy_perform(curl);
        if (res != CURLE_OK)
        {
            fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));
            fclose(fp);
            remove(outputPath);
            return 255;
        }

        curl_easy_cleanup(curl);
        fclose(fp);
    }

    return 0;
}

int main(int argc, char *argv[])
{
    const char *url;
    const char *outputPath = NULL;
    const char *userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    long timeout = 0;
    int skipSSL = 0;
    int followRedirects = 0;
    int useIPv4 = 0;
    int useIPv6 = 0;

    int i;

    if (argc < 2)
    {
        fprintf(stderr, "Usage: %s <url> [-o <output_path>] [-u <user_agent>] [-t <timeout>] [-k] [-L] [-4] [-6]\n", argv[0]);
        return 1;
    }

    url = argv[1];

    for (i = 2; i < argc; i++)
    {
        if (strcmp(argv[i], "-o") == 0)
        {
            if (i + 1 < argc)
            {
                outputPath = argv[i + 1];
                i++;
            }
            else
            {
                fprintf(stderr, "Invalid arguments. Use -o to specify the output path.\n");
                return 1;
            }
        }
        else if (strcmp(argv[i], "-u") == 0)
        {
            if (i + 1 < argc)
            {
                userAgent = argv[i + 1];
                i++;
            }
            else
            {
                fprintf(stderr, "Invalid arguments. Use -u to specify the User-Agent.\n");
                return 1;
            }
        }
        else if (strcmp(argv[i], "-t") == 0)
        {
            if (i + 1 < argc)
            {
                const char *timeoutStr = argv[i + 1];
                i++;
                timeout = parseTimeout(timeoutStr);
                if (timeout < 0)
                {
                    return 1;
                }
            }
            else
            {
                fprintf(stderr, "Invalid arguments. Use -t to specify the timeout.\n");
                return 1;
            }
        }
        else if (strcmp(argv[i], "-k") == 0)
        {
            skipSSL = 1;
        }
        else if (strcmp(argv[i], "-L") == 0)
        {
            followRedirects = 1;
        }
        else if (strcmp(argv[i], "-4") == 0)
        {
            useIPv4 = 1;
        }
        else if (strcmp(argv[i], "-6") == 0)
        {
            useIPv6 = 1;
        }
        else
        {
            fprintf(stderr, "Invalid arguments.\n");
            return 1;
        }
    }

    if (outputPath == NULL)
    {
        outputPath = "/tmp/firmware.img.part";
    }

    int result = downloadFile(url, outputPath, userAgent, timeout, skipSSL, followRedirects, useIPv4, useIPv6);
    if (result != 0)
    {
        fprintf(stderr, "Download failed.\n");
        remove(outputPath);
        return 255;
    }

    return 0;
}
