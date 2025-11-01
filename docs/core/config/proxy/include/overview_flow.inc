@startuml
top to bottom direction

actor MUA [
  MUA (Mail Client)
]

package "Dovecot Proxy" {
  usecase "IMAP/POP3 Service" as ProxyService
  component "Authentication" as ProxyAuth
  note right of ProxyAuth
    passdb {
      driver = static
      args = proxy=y host=...
    }
  end note
}

package "Backend Server" {
  usecase "IMAP/POP3 Service" as BackendService
  database "Mail Storage" as Storage
}


MUA -> ProxyService : "1. Connect"
ProxyService -> ProxyAuth : "2. Authenticate"
ProxyAuth --> BackendService : "3. Proxy to Backend"
BackendService -> Storage : "4. Access Mail"

@enduml
