import sys

path = "C:/Users/kanwa/multi-dept-ai-portal-new/frontend/src/app/chat/page.tsx"
with open(path, 'rb') as f:
    content = f.read()

# Fix 1: renderLabel type - use PieLabelRenderProps compatible signature
OLD1 = b'  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: Record<string, number>) => {'
NEW1 = b'  // eslint-disable-next-line @typescript-eslint/no-explicit-any\r\n  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {'

if OLD1 not in content:
    print("ERROR: Fix 1 target not found")
    sys.exit(1)
content = content.replace(OLD1, NEW1, 1)
print("Fix 1 applied: renderLabel typed as any")

# Fix 2: Tooltip formatter - handle undefined value
OLD2 = b'formatter={(v: number) => [v.toLocaleString(), ""]}'
NEW2 = b'formatter={(v) => [Number(v ?? 0).toLocaleString(), ""]}'

if OLD2 not in content:
    print("ERROR: Fix 2 target not found")
    sys.exit(1)
content = content.replace(OLD2, NEW2, 1)
print("Fix 2 applied: Tooltip formatter handles undefined")

with open(path, 'wb') as f:
    f.write(content)

print("SUCCESS")