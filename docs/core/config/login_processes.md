---
layout: doc
title: Login Processes
dovecotlinks:
  login_processes: login processes
  login_processes_high_performance:
    hash: high-performance-mode
    text: high performance login
---

# Login Processes

The main purpose of login processes is to handle the [[link,imap_server]],
[[link,pop3_server]], [[link,submission_server]], and
[[link,managesieve_server]] connections before the user
has logged in.

The login processes don't need to be able to do anything else
than let the user log in, so they can run in highly restricted environment. By
default they are run as a non-privileged `dovenull` user chrooted into a
non-writable directory containing only authentication UNIX sockets.

Login processes also handle proxying the SSL and TLS connections even after the
user has logged in. This way all the SSL code runs in the same restricted
environment, which means that a security hole in the SSL library gives the
attacker access only to the restricted chroot, rather than possibly all the
users' mails.

The default login settings should be good enough for small sites. There are two
ways to run the login processes: the high-security mode and the
high-performance mode. Both are discussed separately below.

For explanation on the various settings for services, see
[[link,service_configuration]].

## High-Security Mode

You can enable high-security mode with:

```[dovecot.conf]
service imap-login {
  restart_request_count = 1
  #process_min_avail = 0
  #vsz_limit = 64M
}

service pop3-login {
  restart_request_count = 1
}
```

This is the default. It works by using a new imap-login or pop3-login process
for each incoming connection. Since the processes run in a highly restricted
chroot, running each connection in a separate process means that in case there
is a security hole in Dovecot's pre-authentication code or in the SSL library,
the attacker can't see other users' connections and can't really do anything
destructive. The only way out of it is to find and exploit a kernel security
hole.

Since one login process can handle only one connection, the service's
`process_limit` setting limits the number of users that can be logging in at
the same time (defaults to [[setting,service_process_limit,100]]).

SSL/TLS proxying processes are also counted here, so if you're using
SSL/TLS you'll need to make sure this count is higher than the maximum
number of users that can be logged in simultaneously.

With TLS/SSL connections, the login process will not terminate, and remains
to perform proxying between imap backend process and the client.

* If the maximum login process count is reached, the oldest process in
  logging-in state (ie. non-proxying) is destroyed.
* To avoid startup latency for new client connections, set
  `process_min_avail` to higher than zero. That many idling processes are
  always kept around waiting for new connections.
* `vsz_limit` should be fine at its default 64MB value.

## High-Performance Mode

You can enable high-performance mode with:

```[dovecot.conf]
service imap-login {
  restart_request_count = unlimited
  process_min_avail = 4 # number of CPU cores
  vsz_limit = 1G
}

service pop3-login {
  restart_request_count = unlimited
}
```

It works by using a number of long running login processes, each handling a
number of connections. This loses much of the security benefits of the login
process design, because in case of a security hole (in Dovecot or SSL library)
the attacker is now able to see other users logging in and steal their
passwords, read their mails, etc.

* `process_min_avail` should be set to be at least the number of CPU cores in
  the system, so that all of them will be used.
* Otherwise new processes are created only once an existing one's connection
  count reaches [[setting,service_client_limit]].
* Default `client_limit * process_limit = 1000*100 = 100k` connections.
* `vsz_limit` should be increased to avoid out of memory errors, especially
  if you're using SSL/TLS.

## Configuring Socket Paths for Login Processes

The authentication UNIX socket is "login" by default.

[[setting,login_socket_path]] allows to configure this path for all login
processes. For individual processes this can be overridden by supplying
a parameter to the appropriate service's executable.

This example sets up the global socket "general-login-socket" but
overrides this for the imap-login process individually (in `dovecot.conf`):

```[dovecot.conf]
login_socket_path = general-login-socket

service imap-login {
  executable = imap-login specific-login-socket
}
```
