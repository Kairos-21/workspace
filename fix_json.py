
import json

# Read original backup
with open(r'f:\workspace\workspace-backup-2026-04-22T04-15-45.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Modify background path
if 'settings' in data:
    data['settings']['backgroundPath'] = '西湖烟雨.jpg'

# Save
with open(r'f:\workspace\workspace-backup-2026-04-22-default.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Success! Default data file updated.')
print('Background path changed to file reference.')
print('Local app icons (customIconPath) are preserved from original backup.')
