---
layout: doc
title: Autoexpunge
dovecotlinks:
  autoexpunge: Autoexpunge
  autoexpunge_deferred:
    hash: deferred-autoexpunging
    text: "Autoexpunge: Deferred Autoexpunging"
---

# Autoexpunge

Autoexpunging removes messages from a mailbox automatically when they
exceed configured age or message-count thresholds, without any client
action.

It is configured per mailbox with the [[setting,mailbox_autoexpunge]]
and [[setting,mailbox_autoexpunge_max_mails]] settings:

```doveconf[dovecot.conf]
namespace inbox {
  inbox {
    autoexpunge = 30d
  }
  mailbox Trash {
    autoexpunge = 30d
    autoexpunge_max_mails = 1000
  }
}
```

By default, the expunging happens right away when it is triggered:

- **IMAP/POP3**: after the client has disconnected.
- **LMTP**: when the user's mail delivery has finished.

These moments coincide with actual user activity. On large accounts,
expunging thousands of overdue messages can be a sustained, CPU- and
I/O-heavy operation that stacks on top of the load from real user
traffic.

## Settings

<SettingsComponent tags="mailbox" names="mailbox_autoexpunge mailbox_autoexpunge_max_mails mailbox_autoexpunge_action" />

The [[setting,mailbox_list_index,yes]] (mailbox list index) is highly
recommended when using autoexpunge, as it avoids actually opening the
mailbox just to check whether anything needs to be expunged.

## Deferred Autoexpunging

Setting [[setting,mailbox_autoexpunge_action]] to `defer` splits
autoexpunge into two phases:

1. **Detection** (cheap, at the usual trigger times — session teardown
   and delivery). Dovecot checks only the mailbox's message count and
   oldest save date from the mailbox list index, without opening or
   syncing the mailbox. When at least one message meets the
   [[setting,mailbox_autoexpunge]]/[[setting,mailbox_autoexpunge_max_mails]]
   criteria, an [[link,event_autoexpunge_needed]] event is emitted for
   that mailbox. No expunging is done.
2. **Execution** (expensive, when you choose). An external scheduler
   consumes the `autoexpunge_needed` events, queues and de-duplicates
   accounts, and runs [[link,man_doveadm_mailbox_autoexpunge]] at
   off-peak times, e.g. overnight.

The queuing, de-duplication and scheduling logic lives outside
Dovecot; the events and the [[link,man_doveadm_mailbox_autoexpunge]]
command are the integration interface.

### Events

**[[link,event_autoexpunge_needed]]** — emitted per mailbox that (likely)
needs expunging, when a deferred mailbox is checked and a criterion is
met. Fields: `user`, `mailbox` (namespace-qualified name), and
`mailbox_guid` (best-effort). No event is emitted for clean mailboxes.

**[[link,event_autoexpunge_done]]** — emitted per mailbox whenever a run
expunges at least one message. Fields: `user`, `mailbox`, `mailbox_guid`
(best-effort) and `messages_expunged`. Emitted from every execution path
— immediate mode at session teardown/delivery, and
[[link,man_doveadm_mailbox_autoexpunge]] runs — regardless of the
[[setting,mailbox_autoexpunge_action]] setting. Runs that expunge nothing
emit no event.

### Properties

- **Cheap detection**: at most the list-index lookup; no mailbox open or
  sync. Detection is approximate and can over-report (a stale list-index
  entry), but the command re-detects at run time, so redundant runs are
  cheap no-ops.
- **No persistent state**: nothing is written to disk to remember that a
  mailbox needs expunging. If the scheduled run never happens, mail is
  simply not expunged yet; if it runs twice, the second run is a no-op.
- **Concurrency-safe**: the [[link,man_doveadm_mailbox_autoexpunge]]
  command takes the per-user `dovecot.autoexpunge.lock`, so overlapping
  runs for the same user are serialized like today's immediate-mode
  runs.
- **Opt-in per mailbox**: `immediate` remains the default, so existing
  deployments are unchanged. Roll out `defer` gradually, e.g. large
  accounts first.

### Example

Deferred policy on Trash and Spam, with an overnight batch job:

```doveconf[dovecot.conf]
namespace inbox {
  inbox {
    autoexpunge = 30d
    autoexpunge_action = defer
  }
  mailbox Spam {
    autoexpunge = 7d
    autoexpunge_action = defer
  }
}
```

The external system subscribes to `autoexpunge_needed` events (see
[[link,event_autoexpunge_needed]]) and, for each queued `(user, mailbox)` pair,
schedules e.g.:

```sh
doveadm -f json mailbox autoexpunge -u <user> <mailbox>
```

```json
[ { "mailbox": "Spam", "status": "expunged", "expunged": 152 } ]
```
