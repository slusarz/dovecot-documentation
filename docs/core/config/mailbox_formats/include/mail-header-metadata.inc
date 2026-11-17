Unlike when using [[link,mbox]], where mail headers (for example
`Status`, `X-UID`, etc.) are used to determine and store metadata, the
mail headers within the files are (usually) **not** used for this
purpose by Dovecot; neither when mails are created/moved/etc. via IMAP
nor when mailboxes are placed (e.g. copied or moved in the filesystem)
in a mail location (and then "imported" by Dovecot).

Therefore, it is (usually) **not** necessary to strip any such mail
headers at the [[link,mta]], [[link,mda]], or [[link,lda]] (as it is
recommended with [[link,mbox]]).

There is one exception, though, namely when [[setting,pop3_reuse_xuidl,yes]]
is used: in this case `X-UIDL` is used for the POP3 UIDLs.
Therefore, in this case, it is recommended to strip the `X-UIDL` mail
headers *case-insensitively* at the mail delivery layer.
