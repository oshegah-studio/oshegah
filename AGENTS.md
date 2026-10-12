# Architecture rules
- ProfileEditor owns the existing profile form in details or appearance mode; updates persist only that mode's fields so separate editors cannot overwrite unrelated settings.
- Link icon overrides use the existing links.icon column and a shared allowlisted resolver; invalid or absent values fall back to the link type icon.
- Company support uses a single reusable CustomerService link per page, in normal document flow to avoid covering navigation or profile links.