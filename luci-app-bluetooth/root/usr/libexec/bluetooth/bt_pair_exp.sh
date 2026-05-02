#!/usr/bin/expect -f

if { $argc != 1 } {
	puts "Usage: $argv0 <MAC>"
	exit 1
}

set mac [lindex $argv 0]
set timeout 10

spawn bluetoothctl

expect {
	-re "bluetoothctl.*#" {}
	-re "bluetoothctl.*>" {}
	-re ">" {}
}

send "pair $mac\r"

expect {
	-re "yes/no" {
		send "yes\r"
	}
	timeout {
		puts "Timeout waiting for yes/no"
	}
}

sleep 5

expect {
	-re ">" {
		send "quit\r"
	}
	timeout {
		puts "Timeout waiting for device"
	}
}

send "quit\r"

expect eof
