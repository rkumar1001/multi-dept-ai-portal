import sys

path = "C:/Users/kanwa/multi-dept-ai-portal-new/frontend/src/app/chat/page.tsx"
with open(path, 'rb') as f:
    content = f.read()

# ── Patch 1: Replace welcome prompts section to use LogisticsWelcome ──────────
OLD1 = b'              {/* Quick Action Prompts */}\r\n              {quickPrompts.length > 0 && (\r\n                <div className="w-full max-w-2xl">'
NEW1 = b'              {/* Quick Action Prompts */}\r\n              {department === "logistics" ? (\r\n                <LogisticsWelcome onSend={handleSend} />\r\n              ) : quickPrompts.length > 0 && (\r\n                <div className="w-full max-w-2xl">'

if OLD1 not in content:
    print("ERROR: Patch 1 target not found")
    sys.exit(1)

content = content.replace(OLD1, NEW1, 1)
print("Patch 1 applied: LogisticsWelcome wired to welcome screen")

# ── Patch 2: Add AnalyticsPanel after the Chart+Insights row ─────────────────
# Insert after the closing of the Chart+Insights grid div (just before Data Table comment)
OLD2 = b'        {/* Data Table (collapsible) */}'
NEW2 = (
    b'        {/* Recharts Analytics Panel */}\r\n'
    b'        <AnalyticsPanel analytics={buildAnalytics(toolCalls, department)} />\r\n\r\n'
    b'        {/* Data Table (collapsible) */}'
)

if OLD2 not in content:
    print("ERROR: Patch 2 target not found")
    sys.exit(1)

content = content.replace(OLD2, NEW2, 1)
print("Patch 2 applied: AnalyticsPanel added to DashboardMessage")

with open(path, 'wb') as f:
    f.write(content)

print("SUCCESS: both patches applied")