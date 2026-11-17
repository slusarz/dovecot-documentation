You can use LMTP and the Postfix setting
"reject_unverified_recipient" for dynamic address verification. This is
useful as Postfix doesn't need to query an external datasource (MySQL,
LDAP...). Postfix maintains a local database with existing/non-existing
addresses (you can configure how long positive/negative results should
be cached).

To use LMTP and dynamic address verification, you must first get Dovecot
working. Then you can configure Postfix to use LMTP and set
"reject_unverified_recipient" in the `smtpd_recipient_restrictions`.

On every incoming email, Postfix will probe if the recipient address
exists. You will see entries in your logfile:

```
Recipient address rejected: undeliverable address: host tux.example.com[private/dovecot-lmtp] said: 550 5.1.1 < tzknvtr@example.com > User doesn't exist: tzknvtr@example.com (in reply to RCPT TO command); from=< cnrilrgfclra@spammer.org > to=< tzknvtr@example.com >
```

If the recipient address exists (status=deliverable) Postfix accepts the
mail.
