---
layout: doc
title: Postfix
---

# Postfix and Dovecot LMTP

## Basic Configuration

The first step is to enable LMTP in `dovecot.conf`:

```doveconf[dovecot.conf]
protocols = imap lmtp
```

## Socket Configuration

The LMTP service can be bound to both INET or Unix sockets.

In this example, a Unix socket is placed inside the Postfix spool with
appropriate permissions set:

```doveconf[dovecot.conf]
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    group = postfix
    mode = 0600
    user = postfix
  }
}
```

Note that the socket needs to be placed there because Postfix access is
limited to this directory.

## Plugin Support

Plugin support can be enabled at protocol level for [[plugin,quota]] and
[[plugin,sieve]].

```doveconf[dovecot.conf]
protocol lmtp {
  # REQUIRED
  postmaster_address = postmaster@domainname
  mail_plugins {
    quota = yes
    sieve = yes
  }
}
```

## Postfix `main.cf` Configuration

The final step is to tell Postfix to use this socket for final delivery,
in this case of a virtual user scenario:

```
virtual_transport = lmtp:unix:private/dovecot-lmtp
```

For a non virtual user setup:

```
mailbox_transport = lmtp:unix:private/dovecot-lmtp
```

## Dynamic Address Verification with LMTP

<!-- @include: include/dynamic-address-verification.inc -->

See: [Postfix reject_unverified_recipient](https://www.postfix.org/ADDRESS_VERIFICATION_README.html).

::: info
You cannot use "reject_unverified_recipient" with "pipe", so this doesn't
work with the Dovecot LDA "deliver".
:::
