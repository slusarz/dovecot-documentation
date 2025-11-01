@startuml
top to bottom direction

actor MUA [
  MUA (Mail Client)
]

package "Dovecot imapc Proxy" {
  usecase "IMAP Service" as ImapProxy
  component "Dovecot Auth" as DovecotAuth
}

package "Microsoft Exchange" {
  usecase "IMAP Service" as ExchangeImap
  database "Mail Storage" as ExchangeStorage
}

MUA -> ImapProxy : "1. Connect & Authenticate"
ImapProxy -> DovecotAuth : "2. Passdb Lookup"
DovecotAuth -> ExchangeImap : "3. Authenticate against Exchange"
ExchangeImap --> DovecotAuth : "4. Auth Success"
DovecotAuth --> ImapProxy : "5. Return Success"
ImapProxy -> ExchangeImap : "6. Proxy IMAP Commands"
ExchangeImap -> ExchangeStorage : "7. Access Mail"

@enduml
