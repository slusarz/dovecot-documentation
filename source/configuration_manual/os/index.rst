.. _os_configuration:

======================
OS Configuration
======================

The default Linux configurations are usually quite good. The only things needed
to check are:

* ``/proc/sys/fs/inotify/max_user_watches`` and ``max_user_instances`` need to
  be large enough to handle all the IDLEing IMAP processes.

.. code-block:: none

  fs.inotify.max_user_instances = 65535
  fs.inotify.max_user_watches = 65535

* In order to reduce I/O on the backends, it is recommended to disable the ext4
  journal:

.. code-block:: none

  tune2fs -O ^has_journal /dev/vdb
  e2fsck -f /dev/vdb

* Dovecot doesn't require atimes, so you can mount the filesystem with noatime

.. code-block:: none

  mount -o defaults,discard,noatime /dev/vdb /storage

* All the servers' hostnames must be unique. This is relied on in many
  different places.
* Make sure the servers are running ntpd or some other method of synchronizing
  clocks. The clocks shouldn't differ more than 1 second. 

The time must never go backwards - this is especially important in Dovecot
backends when using Cassandra, because otherwise ``DELETEs`` or ``UPDATEs`` may
be ignored when the query timestamp is older than the previous
``INSERT/UPDATE``.

* With busy servers Dovecot might run out of TCP ports. It may be useful to
  increase ``net.ipv4.ip_local_port_range``.

.. code-block:: none

   net.ipv4.ip_local_port_range = 1024 65500

TIME-WAIT Connections
^^^^^^^^^^^^^^^^^^^^^^

https://vincent.bernat.ch/en/blog/2014-tcp-time-wait-state-linux explains these pretty well. Summary:

* ``net.ipv4.tcp_tw_reuse=1`` can help to avoid "Cannot assign requested address" errors for outgoing connections and is rather safe to set. It only affects outgoing connections.

* ``net.ipv4.tcp_tw_recycle=1`` can help with incoming connections also inside a private network (not in public-facing proxies), but it's still not recommended. 
   In ``Linux 4.10`` and later it's broken, and in ``Linux 4.12`` it's been removed entirely.


Not recommended
^^^^^^^^^^^^^^^^

Adjusting TCP buffer sizes is also usually a bad idea, unless your kernel is very
old and you have good knowledge of the types of TCP traffic (number of connections,
bandwidth consumed, activity patterns etc) you will have.

