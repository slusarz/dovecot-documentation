---
layout: doc
title: doveadm-penalty
dovecotComponent: core
---

# doveadm-penalty(1) - Show current penalties

## SYNOPSIS

**doveadm** [*GLOBAL OPTIONS*] **penalty**
  [**-a** *anvil_socket_path*]
  [*ip* [**/** *mask*]]

## DESCRIPTION

The **doveadm penalty** command can be used to see the current
penalties.

<!-- todo:: (Extend me!/explain it) -->

<!-- @include: include/global-options.inc -->

## OPTIONS

<!-- @include: include/option-anvil-socket.inc -->

## ARGUMENTS

*ip* [/*mask*]
:   To reduce/filter the output supply an IP address or a network range
    in CIDR notation (ip/mask).

## EXAMPLE

```sh
doveadm penalty
```
```
IP               penalty last_penalty        last_update
192.0.2.222            3 2010-06-15 15:19:27 15:19:27
192.0.2.53             3 2010-06-15 15:19:34 15:19:34
```

<!-- @include: include/reporting-bugs.inc -->

## SEE ALSO

[[man,doveadm]]
