import re
import os

file_path = 'src/pages/focus/index.tsx'
print(f"Reading {file_path}...")

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
except FileNotFoundError:
    print(f"Error: {file_path} not found.")
    exit(1)

# 1. Revert automatic modal logic
old_logic = """
    // 显示结束选项界面
    setState(finalState);
    setShowEndOptions(false); // 先隐藏选项，显示 Modal
    
    console.log('🛑 专注计时器已停止', { finalElapsedTime, state: finalState });
    
    // 延迟一下显示 Modal
    setTimeout(() => {
      setShowSummaryModal(true);
    }, 1000);
"""

new_logic = """
    // 显示结束选项界面
    setState(finalState);
    setShowEndOptions(false);
    
    console.log('🛑 专注计时器已停止', { finalElapsedTime, state: finalState });
    
    // 延迟一下再显示选项，让用户看到结果
    setTimeout(() => {
      setShowEndOptions(true);
    }, 1500);
"""

# Normalize whitespace for matching (simple normalization)
def normalize(s):
    return ' '.join(s.split())

# We can try strict replacement first
if old_logic.strip() in content:
    content = content.replace(old_logic.strip(), new_logic.strip())
    print("Reverted automatic modal logic.")
else:
    # Try more loose matching or just search for the specific lines
    if "setShowEndOptions(false); // 先隐藏选项，显示 Modal" in content:
        content = content.replace("setShowEndOptions(false); // 先隐藏选项，显示 Modal", "setShowEndOptions(false);")
        content = content.replace("setTimeout(() => {\n      setShowSummaryModal(true);\n    }, 1000);", 
                                  "setTimeout(() => {\n      setShowEndOptions(true);\n    }, 1500);")
        print("Reverted logic via partial match.")

# 2. Add 'Write Summary' button
button_code = """
              <button
                onClick={() => setShowSummaryModal(true)}
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-4 py-4 text-lg hover:shadow-lg shadow-teal-300/50 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                写今日小结
              </button>
"""

# Find where to insert it. Before "返回主页" button.
target_str = '<button\n                onClick={goToDashboard}'
if '写今日小结' not in content:
    if target_str in content:
        content = content.replace(target_str, button_code + target_str)
        print("Added 'Write Summary' button.")
    else:
        # Try finding simpler version
        target_str_simple = 'onClick={goToDashboard}'
        idx = content.find(target_str_simple)
        if idx != -1:
            # Find the start of that button
            btn_start = content.rfind('<button', 0, idx)
            content = content[:btn_start] + button_code + content[btn_start:]
            print("Added 'Write Summary' button (fallback match).")
else:
    print("'Write Summary' button already present.")

# 3. Fix modal close logic
old_close = "setShowEndOptions(true);"
# We want to remove this line inside onClose
# Because now we close modal and reveal nothing (end options are already there underneath?)
# No, if we open modal from EndOptions, EndOptions is likely hidden or covered?
# If modal is a fixed overlay, EndOptions is strictly speaking still "there".
# But if we want to BE at EndOptions after closing modal:
# If showEndOptions was true, and we opened modal (on top), closing modal reveals EndOptions.
# So actually we don't need to change `setShowEndOptions(true)` if it's already true.
# But `FocusSummaryModal` logic in `focus/index.tsx`:
# if (showSummaryModal) return <Modal ... />
# So if showSummaryModal is true, EndOptions is NOT rendered (since it returns early?).
# Let's check `focus/index.tsx` structure.
# It uses `if (showSummaryModal) return ...`.
# So EndOptions (part of `state === 'completed'`) is NOT rendered.
# So when closing Modal, we MUST set `setShowSummaryModal(false)`.
# And we MUST ensure `showEndOptions` is true (it probably is).
# But if we transitioned from `endFocus`, `showEndOptions` is true.
# The previous code had `onClose={() => { setShowSummaryModal(false); setShowEndOptions(true); }}`.
# This is actually correct for the new flow too!
# Because we render Modal *instead* of the main view.
# So when we close it, we want to go back to main view (EndOptions).
# So `setShowEndOptions(true)` is fine.
# But wait, my manual edit removed `setShowEndOptions(true)` in the `search_replace` attempt?
# "If closed from End Options screen, we just close modal and stay on End Options"
# If I removed it, I should verify.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated focus/index.tsx.")



