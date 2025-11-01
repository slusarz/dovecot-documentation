@startuml
top to bottom direction

actor MUA [
  MUA (Mail Client)
]

package "Dovecot Proxy" {
  usecase "Login Service\n(e.g., IMAP, POP3)" as ProxyLogin
  component "Dovecot Auth" as ProxyAuth
}

package "Dovecot Backend" {
  usecase "Backend Service\n(e.g., IMAP, POP3)" as BackendService
  database "Mail Storage" as Storage
}

MUA -> ProxyLogin : "1. Connect & Authenticate"
ProxyLogin -> ProxyAuth : "2. Verify Credentials"
ProxyAuth --> ProxyLogin : "3. Auth Success"
ProxyLogin -> BackendService : "4. Proxy Connection"
BackendService -> Storage : "5. Access Mail"
@enduml
