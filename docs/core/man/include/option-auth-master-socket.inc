**-a** *master_socket_path*
:   This option is used to specify an absolute path to an alternative
    UNIX domain socket.
    By default [[man,doveadm]] will use the socket */rundir/auth-master*.
    The socket may be located in another directory, when the default
    *base_dir* setting was overridden in */etc/dovecot/dovecot.conf*.
