# Phase B: Generation (PlantUML)

Generate ASCII from `.puml` files. Requires PlantUML installed (`brew install plantuml`, `apt install plantuml`, or `java -jar plantuml.jar`).

### Workflow
```
plantuml -utxt diagram.puml           # Unicode (preferred)
plantuml -txt diagram.puml             # Standard ASCII
# Output: diagram.utxt or diagram.atxt
```

### Templates (7 types)

| Type | Description |
|------|------------|
| **Sequence** | Actor → System → DB interactions |
| **Class** | Types, fields, methods, relationships |
| **Activity** | Workflow branches, decision nodes |
| **State** | State transitions, entry/exit, events |
| **Component** | Service boundaries, dependencies |
| **Use Case** | Actors, system boundary, use cases |
| **Deployment** | Nodes, servers, databases, replicas |

#### Sequence Example
```plantuml
@startuml
actor User
participant "Web App" as App
database "Database" as DB

User -> App : Login Request
App -> DB : Validate Credentials
DB --> App : User Data
App --> User : Auth Token
@enduml
```

#### Component Example
```plantuml
@startuml
[Client] as client
[API Gateway] as gateway
[Service A] as svcA
[Database] as db

client --> gateway
gateway --> svcA
svcA --> db
@enduml
```

#### Activity Example (branching workflows)
```plantuml
@startuml
start
:Initialize;
if (Is Valid?) then (yes)
  :Process Data;
  :Save Result;
else (no)
  :Log Error;
  stop
endif
:Complete;
stop
@enduml
```

#### State Example (state transitions)
```plantuml
@startuml
[*] --> Idle
Idle --> Processing : start
Processing --> Success : complete
Processing --> Error : fail
Success --> [*]
Error --> Idle : retry
@enduml
```

### CLI Options
```
plantuml -utxt -o ./output diagram.puml    # output dir
plantuml -utxt ./diagrams/                  # batch dir
plantuml -utxt -charset UTF-8 diagram.puml  # charset
```
