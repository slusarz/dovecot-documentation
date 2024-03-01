.. _dovecot_proxy:

=============
Dovecot Proxy
=============

Dovecot can be configured for use in "proxy" mode on a single server.
In this mode, Dovecot is responsible for proxying incoming email protocols
to remote hosts.

A proxy's job is typically:

 * Handle SSL/TLS encryption
 * Authenticate the user
 * Redirect to the remote server

Proxying can be done for all users, or only for some specific users.

There are two ways to do the authentication:

#. Forward the password to the remote server. The proxy may or may not perform
   authentication itself. This requires that the client uses only cleartext
   authentication mechanism, or alternatively the proxy has access to users'
   passwords in cleartext.

#. Let Dovecot proxy perform the authentication and login to remote server
   using the proxy's master password. This allows client to use also
   non-cleartext authentication mechanism. This requires the remote server to
   support master password authentication.
