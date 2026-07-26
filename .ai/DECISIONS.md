# DECISIONS.md — Architectural Decision Log

## ADR-001: Adopt Domain-Driven Modular Architecture

**Status:** Accepted  
**Date:** 2026-07-25  
**Decision Makers:** Lead Architect, Human Maintainer  
**Scope:** Repository structure, code organization, long-term maintainability

### Context

RSTC_App is currently a monolithic Node.js/Express application with all routes, business logic, database access, and configuration in a single `server.js` file (~988 lines). As the application scales and multiple AI coding agents work concurrently, this creates merge conflicts, cognitive overload, and risk of breaking unrelated features.

A prior proposal suggested a file-type-driven structure (`config/`, `controllers/`, `services/`, `repositories/`, `routes/`). That approach was **rejected** because it groups code by technical layer rather than business capability, making it harder to understand feature boundaries and risking the mixing of domain and infrastructure concerns.

### Decision

Adopt a **domain-driven modular architecture** where:

1. Business capabilities (personnel, missions, users, reports, backup, options, audit, AI, dashboard) are organized as **domains** in `src/domains/`.
2. Each domain is a **self-contained vertical slice** owning its routes, services, repositories, validators, constants, and DTOs.
3. Cross-cutting technical concerns are isolated in `src/infrastructure/` (config, database, middleware, security, utils).
4. Domains depend on infrastructure but **not on each other's internals**.
5. The app layer (`src/app/`) is a thin bootstrap that wires infrastructure to domains.

### Consequences

**Positive:**
- Domains can be understood, tested, and maintained independently.
- New domains (Vehicles, Contracts, Inventory, Finance, Notifications) can be added without modifying existing domains.
- AI agents can work on separate domains concurrently with minimal merge conflicts.
- Infrastructure changes (e.g., database driver swap) only touch `src/infrastructure/`.
- Scales from ~1,000 LOC to 50,000+ LOC without architectural redesign.

**Negative:**
- More files and directories to navigate compared to a monolith.
- Requires strict import discipline to prevent cross-domain coupling.
- Initial extraction is labor-intensive and must be done incrementally.
- Some intentional duplication across domains (e.g., similar repository patterns) may occur.

### Alternatives Considered

| Alternative | Rationale for Rejection |
|-------------|------------------------|
| Keep monolithic `server.js` | Does not solve merge conflicts, cognitive load, or scaling issues. |
| File-type-driven structure (`config/`, `services/`, etc.) | Groups by technical layer, not business capability. Harder to understand feature boundaries. |
| Microservices | Overkill for a single-team internal tool. Adds network complexity and deployment overhead. |
| Feature-sliced structure | Viable but less strict about infrastructure isolation. Domain-driven better matches bounded contexts. |
| Layered architecture (`presentation/`, `application/`, `domain/`, `infrastructure/`) | Too abstract for small team. Domain layer becomes a dumping ground. |

### Implementation Notes

- See `docs/architecture/TARGET_ARCHITECTURE.md` for complete structure, naming rules, dependency rules, and migration phases.
- Follow `docs/architecture/MODULARIZATION_PLAN.md` for phased extraction from current `server.js`.
- Phase 0 (Preparation) is the immediate next step: create directory structure and route registry.

### References

- `docs/architecture/TARGET_ARCHITECTURE.md`
- `docs/architecture/MODULARIZATION_PLAN.md`
- `.ai/IMPLEMENTATION_WORKFLOW.md`
