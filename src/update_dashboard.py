import re
import os

file_path = 'src/pages/dashboard/index.tsx'
print(f"Reading {file_path}...")

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
except FileNotFoundError:
    print(f"Error: {file_path} not found.")
    exit(1)

# 1. Add import
import_stmt = "import TodaySummaryCard from './TodaySummaryCard';"
if import_stmt not in content:
    print("Adding import...")
    content = content.replace("import AchievementPanel from './AchievementPanel';", 
                              "import AchievementPanel from './AchievementPanel';\nimport TodaySummaryCard from './TodaySummaryCard';")
else:
    print("Import already present.")

# 2. Replace card
# Marker in the opening div of the card
card_start_marker = 'bg-white/90 backdrop-blur-sm border-2 border-white/80 rounded-[2rem] p-6 md:p-8 shadow-xl shadow-emerald-100/50'

start_idx = content.find(card_start_marker)
if start_idx != -1:
    # Find the start of the tag (<div ...)
    tag_start = content.rfind('<div', 0, start_idx)
    
    # Marker near the end of the card
    # Using the class name of the last p tag
    end_marker = 'text-xs text-zinc-400 text-center'
    end_marker_idx = content.find(end_marker, start_idx)
    
    if end_marker_idx != -1:
        # Find the closing </p>
        p_end = content.find('</p>', end_marker_idx)
        # Find the closing </div> for the card
        div_end = content.find('</div>', p_end)
        
        if div_end != -1:
            old_block = content[tag_start:div_end+6]
            print(f"Found block to replace (Length: {len(old_block)})")
            
            new_block = "<TodaySummaryCard userId={session?.user?.id || ''} />"
            content = content.replace(old_block, new_block)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated file.")
        else:
            print("Could not find div end.")
    else:
        print("Could not find end marker.")
else:
    print("Could not find start marker.")


