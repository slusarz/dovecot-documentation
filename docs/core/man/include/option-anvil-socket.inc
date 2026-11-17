**-a** *anvil_socket_path*
:   This option is used to specify an alternative socket. The option's
    argument is either an absolute path to a local UNIX domain socket, or
    a hostname and port (*hostname*:*port*), in order to connect a remote
    host via a TCP socket.
    By default [[man,doveadm]] will use the socket */rundir/anvil*.
    The socket may be located in another directory, when the default
    *base_dir* setting was overridden in */etc/dovecot/dovecot.conf*.
