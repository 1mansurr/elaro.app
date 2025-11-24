# HomeScreen Component Interaction Diagram

## 🏗️ **Component Architecture Overview**

```mermaid
graph TB
    subgraph "HomeScreen Container"
        HS[HomeScreen.tsx<br/>85 lines]
    end

    subgraph "State Management"
        HSS[useHomeScreenState<br/>Centralized state]
        HSA[useHomeScreenActions<br/>Action handlers]
    end

    subgraph "UI Components"
        HSH[HomeScreenHeader<br/>Greeting & Notifications]
        HSC[HomeScreenContent<br/>Scrollable Content]
        HSF[HomeScreenFAB<br/>Floating Actions]
        HSM[HomeScreenModals<br/>Modals & Sheets]
    end

    subgraph "Performance Layer"
        PM[Performance Monitoring]
        RD[Request Deduplication]
        MEM[Memoization Hooks]
    end

    subgraph "External Services"
        API[Supabase API]
        AUTH[Auth Context]
        QUERY[React Query]
        NAV[Navigation]
    end

    HS --> HSS
    HS --> HSA
    HS --> HSH
    HS --> HSC
    HS --> HSF
    HS --> HSM

    HSS --> PM
    HSA --> RD
    HSA --> MEM

    HSH --> AUTH
    HSC --> QUERY
    HSF --> NAV
    HSM --> API

    PM --> HSH
    PM --> HSC
    PM --> HSF
    PM --> HSM
```

## 🔄 **Data Flow Diagram**

```mermaid
sequenceDiagram
    participant U as User
    participant HS as HomeScreen
    participant HSS as useHomeScreenState
    participant HSA as useHomeScreenActions
    participant HSH as HomeScreenHeader
    participant HSC as HomeScreenContent
    participant HSF as HomeScreenFAB
    participant HSM as HomeScreenModals

    U->>HS: App Launch
    HS->>HSS: Initialize State
    HSS->>HSH: Render Header
    HSS->>HSC: Render Content
    HSS->>HSF: Render FAB
    HSS->>HSM: Render Modals

    U->>HSF: Tap FAB
    HSF->>HSA: handleFabStateChange
    HSA->>HSC: Update scrollEnabled
    HSA->>HSF: Show Actions

    U->>HSC: Swipe Task
    HSC->>HSA: handleSwipeComplete
    HSA->>API: Complete Task
    HSA->>HSC: Update UI

    U->>HSH: Tap Notification
    HSH->>HSA: handleNotificationPress
    HSA->>HSM: Show History Modal
```

## ⚡ **Performance Optimization Flow**

```mermaid
graph LR
    subgraph "Component Mount"
        A[Component Renders] --> B[Performance Timer Starts]
        B --> C[Component Logic Executes]
        C --> D[Performance Timer Ends]
        D --> E[Metrics Recorded]
    end

    subgraph "User Interaction"
        F[User Action] --> G[Stable Callback]
        G --> H[Performance Timer]
        H --> I[Action Execution]
        I --> J[Timer End]
        J --> K[Metrics Update]
    end

    subgraph "Data Processing"
        L[Data Change] --> M[useExpensiveMemo Check]
        M --> N{Cache Valid?}
        N -->|Yes| O[Return Cached]
        N -->|No| P[Recalculate]
        P --> Q[Update Cache]
        O --> R[Render Update]
        Q --> R
    end
```

## 🧪 **Testing Architecture**

```mermaid
graph TB
    subgraph "Test Suite"
        UT[Unit Tests<br/>Component isolation]
        IT[Integration Tests<br/>Component interaction]
        PT[Performance Tests<br/>Optimization validation]
    end

    subgraph "Test Components"
        HSH_T[HomeScreenHeader Tests]
        HSC_T[HomeScreenContent Tests]
        HSF_T[HomeScreenFAB Tests]
        HSM_T[HomeScreenModals Tests]
    end

    subgraph "Test Types"
        RENDER[Render Tests]
        INTERACT[Interaction Tests]
        PERF[Performance Tests]
        ERROR[Error Handling Tests]
    end

    UT --> HSH_T
    UT --> HSC_T
    UT --> HSF_T
    UT --> HSM_T

    IT --> RENDER
    IT --> INTERACT
    PT --> PERF
    IT --> ERROR
```

## 🔧 **Hook Dependencies**

```mermaid
graph TD
    subgraph "useHomeScreenState"
        A[Auth Context]
        B[React Query]
        C[Local State]
        D[Performance Monitoring]
    end

    subgraph "useHomeScreenActions"
        E[State from useHomeScreenState]
        F[Toast Context]
        G[Mutation Hooks]
        H[Performance Monitoring]
    end

    subgraph "useTrialBanner"
        I[User Data]
        J[AsyncStorage]
        K[Performance Monitoring]
    end

    A --> E
    B --> E
    C --> E
    D --> H
    I --> K
    J --> K
```

## 📊 **Performance Metrics Flow**

```mermaid
graph LR
    subgraph "Component Lifecycle"
        A[Mount] --> B[Start Timer]
        B --> C[Execute Logic]
        C --> D[End Timer]
        D --> E[Record Metric]
    end

    subgraph "User Interactions"
        F[User Action] --> G[Start Timer]
        G --> H[Execute Action]
        H --> I[End Timer]
        I --> J[Record Metric]
    end

    subgraph "Data Processing"
        K[Data Change] --> L[Check Cache]
        L --> M{Cache Hit?}
        M -->|Yes| N[Use Cached]
        M -->|No| O[Calculate]
        O --> P[Update Cache]
        N --> Q[Render]
        P --> Q
    end

    E --> R[Performance Dashboard]
    J --> R
    Q --> R
```

## 🎯 **Component Communication**

```mermaid
graph TB
    subgraph "Parent-Child Communication"
        HS[HomeScreen] -->|Props| HSH[HomeScreenHeader]
        HS -->|Props| HSC[HomeScreenContent]
        HS -->|Props| HSF[HomeScreenFAB]
        HS -->|Props| HSM[HomeScreenModals]
    end

    subgraph "State Synchronization"
        HSS[useHomeScreenState] -->|State| HS
        HSA[useHomeScreenActions] -->|Actions| HS
        HS -->|Props| HSH
        HS -->|Props| HSC
        HS -->|Props| HSF
        HS -->|Props| HSM
    end

    subgraph "Event Flow"
        HSH -->|onNotificationPress| HSA
        HSC -->|onSwipeComplete| HSA
        HSF -->|onStateChange| HSA
        HSM -->|onCloseSheet| HSA
    end
```

## 🔍 **Error Handling Flow**

```mermaid
graph TD
    subgraph "Error Boundaries"
        A[Component Error] --> B[Error Boundary]
        B --> C[Fallback UI]
        C --> D[Error Logging]
    end

    subgraph "Network Errors"
        E[API Error] --> F[Error State]
        F --> G[Retry Mechanism]
        G --> H[User Feedback]
    end

    subgraph "Performance Errors"
        I[Slow Performance] --> J[Performance Alert]
        J --> K[Optimization Suggestion]
        K --> L[Auto-optimization]
    end
```

## 📱 **Mobile-Specific Considerations**

```mermaid
graph TB
    subgraph "Touch Interactions"
        A[Touch Start] --> B[Gesture Recognition]
        B --> C[Action Execution]
        C --> D[Visual Feedback]
    end

    subgraph "Scroll Performance"
        E[Scroll Event] --> F[Throttle Scroll]
        F --> G[Update UI]
        G --> H[Maintain 60fps]
    end

    subgraph "Memory Management"
        I[Component Unmount] --> J[Cleanup Timers]
        J --> K[Clear Caches]
        K --> L[Release Memory]
    end
```

---

## 📚 **Key Benefits of This Architecture**

1. **🔧 Maintainability**: Clear separation of concerns
2. **⚡ Performance**: Optimized with memoization and monitoring
3. **🧪 Testability**: Component-level testing capabilities
4. **📱 Scalability**: Easy to extend and modify
5. **🐛 Debugging**: Clear data flow and error boundaries
6. **📊 Monitoring**: Built-in performance tracking
