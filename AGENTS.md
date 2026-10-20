# Architecture rules
- Headers reuse MobileHeaderMenu and existing appearance/language hooks below their existing breakpoint (sm for public/auth, lg for DashboardShell); Radix Popover owns dismissal and focus rather than a parallel navigation state system.
- ProfileEditor owns the existing profile form in details or appearance mode; updates persist only that mode's fields so separate editors cannot overwrite unrelated settings.
- Link icon overrides use the existing links.icon column and a shared allowlisted resolver; invalid or absent values fall back to the link type icon.
- Company support uses a single reusable CustomerService link per page, in normal document flow to avoid covering navigation or profile links.
- Privileged access = admin role in user_roles AND a live admin step-up session bound to the current sign-in session (is_admin()); admin roles change only through owner-only database functions, never direct table writes — so hidden UI never grants access.
- Leaderboard pages come from a server-side paginated database function returning global ranks and a total count, so pages stay consistent without downloading every profile.
- App-served video ships as both H.264 MP4 and VP9 WebM sources from CDN assets, with the player box set to the film's own aspect ratio — no browser decodes every format, and cropping a screen recording hides the UI it teaches.
