---
layout: doc
title: notify-status
---

# Notify Status Plugin (`notify-status`)

This plugin updates a [[link,dict]] with mailbox status information
every time a mailbox changes.

## Settings

::: warning
This plugin requires that the [[plugin,notify]] is loaded.
:::

<SettingsComponent plugin="notify-status" />

## Configuration

### Dictionary Configuration

See [[link,dict]] for how to configure dictionaries.

This plugin updates the `priv/status/<mailbox name>` key.

### Example

```[dovecot.conf]
mail_plugins {
  notify = yes
  notify_status = yes
}

notify_status {
  dict proxy {
    name = notify_status
    socket_path = dict-async
  }
}

# By default no mailbox is added to dict. To enable all notify_status for
# all mailboxes add:
#mailbox_notify_status = yes

# If you keep the default mailbox_notify_status = no you can enable it per
# mailbox like this:
mailbox inbox {
  notify_status = yes
}
mailbox TestBox {
  notify_status = yes
}
```
### SQL dict Example

::: code-group

```[Dictionary Map]
dict_map priv/status/$box {
  sql_table = mailbox_status
  username_field = username

  key_field mailbox {
    value = $box
  }
  value_field status {
  }
}
```

```sql[SQL Schema]
CREATE TABLE mailbox_status (
  username VARCHAR(255) NOT NULL,
  mailbox VARCHAR(255) NOT NULL,
  status VARCHAR(255),
  PRIMARY KEY (username, mailbox)
);
```

:::
