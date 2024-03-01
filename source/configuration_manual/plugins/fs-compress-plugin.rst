.. _fs_compress_plugin:

==================
fs-compress plugin
==================

It can be used by any of the settings using the FS drivers.

The exact location where to set it in the FS driver string depends on what
other FS drivers are being used.

The important rules are:

 * Must be set before the final storage driver (s3, sproxyd, ...)
 * Should be set after fscache (you generally don't want fscache to be
   compressed for performance reasons).
 * Must be set before :ref:`fs_crypt`, because encrypted data compresses
   poorly.

Settings
========

See :ref:`plugin-fs-compress` for ``dovecot.conf`` setting information.

The fs-compress configuration format is:

.. code-block:: none

  compress:<compress_save>:<compress_save_level>

See :dovecot_plugin:ref:`compress_save <mail_compress_save>` for information on
available compression algorithms.

See :dovecot_plugin:ref:`compress_save_level <mail_compress_save_level>` for
information on compression levels and defaults.

Optional compression
--------------------

.. dovecotadded:: 2.2.34

By default fs-compress requires that the mail is compressed with the specified
algorithm.

To allow adding compression to existing storages without compression, you can
use the "maybe-" prefix in front of the algorithm.
