CC = gcc
CFLAGS += -lcurl

program: fw_download_tool.c
	$(CC) $(CFLAGS) -o fw_download_tool fw_download_tool.c

clean:
	rm -f fw_download_tool
