#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adrik Omrak INTJ-A OS - Helper CLI Tool
Zero-dependency operational script for daily sheets and weekly audits.
"""

import sys
import os
import re
import datetime
import subprocess

# Set UTF-8 encoding for standard output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
JOURNAL_DIR = os.path.join(BASE_DIR, "journal")
DOCS_DIR = os.path.join(BASE_DIR, "Documentation")
TEMPLATE_PATH = os.path.join(DOCS_DIR, "DAILY_TEMPLATE_INTJ_A.md")

ARABIC_DAYS = {
    0: "الإثنين",
    1: "الثلاثاء",
    2: "الأربعاء",
    3: "الخميس",
    4: "الجمعة",
    5: "السبت",
    6: "الأحد"
}

def get_current_info():
    now = datetime.date.today()
    iso_year, iso_week, _ = now.isocalendar()
    week_str = f"{iso_year}-W{iso_week:02d}"
    date_str = now.strftime("%Y-%m-%d")
    day_name = ARABIC_DAYS.get(now.weekday(), "")
    return now, date_str, week_str, day_name

def cmd_today(open_editor=True):
    now, date_str, week_str, day_name = get_current_info()
    week_dir = os.path.join(JOURNAL_DIR, week_str)
    os.makedirs(week_dir, exist_ok=True)
    
    file_path = os.path.join(week_dir, f"{date_str}.md")
    
    is_new = not os.path.exists(file_path)
    if is_new:
        if os.path.exists(TEMPLATE_PATH):
            with open(TEMPLATE_PATH, "r", encoding="utf-8") as tf:
                content = tf.read()
        else:
            content = "# سجل التشغيل اليومي: أدرك عمرك\n"
        
        # Populate template placeholders
        content = content.replace("2026-___-___", date_str)
        content = content.replace("[السبت/الأحد/...]", day_name)
        content = content.replace("W___", f"W{now.isocalendar()[1]:02d}")
        content = content.replace("[ ] نشط  [ ] مغلق", "[x] نشط  [ ] مغلق")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✨ تم إنشاء سجل اليوم الجديد بنجاح:\n   {file_path}")
    else:
        print(f"📄 سجل اليوم موجود بالفعل:\n   {file_path}")

    print("\n" + "="*50)
    print("🛡️  القواعد الذهبية الثلاث لـ INTJ-A:")
    print("1. لا تبدأ المؤقت قبل كتابة شرط الإغلاق الثنائي (Done When).")
    print("2. املأ سطر (Out of Scope) لمنع فخ الهندسة المفرطة.")
    print("3. عند رنين مؤقت الـ 90 دقيقة: إغلاق تام أو تشخيص RCA بدقيقتين.")
    print("="*50 + "\n")

    if open_editor and sys.platform == "win32":
        try:
            os.startfile(file_path)
        except Exception:
            pass

def cmd_audit(target_week=None):
    if not target_week:
        _, _, week_str, _ = get_current_info()
        target_week = week_str

    week_dir = os.path.join(JOURNAL_DIR, target_week)
    if not os.path.exists(week_dir):
        print(f"❌ لم يتم العثور على مجلد للأسبوع: {target_week}")
        return

    print(f"📊 تدقيق ومراجعة الأسبوع: {target_week}")
    print("-" * 50)

    daily_files = sorted([f for f in os.listdir(week_dir) if re.match(r"^\d{4}-\d{2}-\d{2}\.md$", f)])
    if not daily_files:
        print("⚠️ لا توجد سجلات يومية في هذا الأسبوع حتى الآن.")
        return

    total_days = len(daily_files)
    total_planned_blocks = total_days * 3
    total_closed_blocks = 0
    bug_a_count = 0
    bug_b_count = 0
    bug_c_count = 0
    parking_lot_items = []

    for df in daily_files:
        p = os.path.join(week_dir, df)
        with open(p, "r", encoding="utf-8") as f:
            text = f.read()
        
        # Check closed blocks
        closed = len(re.findall(r"\[x\]\s*(?:✅|تم الإغلاق)", text, re.IGNORECASE))
        # Or look at daily metrics
        metric_match = re.search(r"عدد الكتل المغلقة بنجاح:\s*(\d+)", text)
        if metric_match and int(metric_match.group(1)) > 0:
            closed = max(closed, int(metric_match.group(1)))
        total_closed_blocks += closed

        # Bugs check
        if re.search(r"\[x\]\s*(?:\*\*)?Bug A", text, re.IGNORECASE):
            bug_a_count += 1
        if re.search(r"\[x\]\s*(?:\*\*)?Bug B", text, re.IGNORECASE):
            bug_b_count += 1
        if re.search(r"\[x\]\s*(?:\*\*)?Bug C", text, re.IGNORECASE):
            bug_c_count += 1

        # Parking lot items
        pl_match = re.search(r"## 4\. سلة الأفكار والتفرعات المؤجلة.*?\n(.*?)(?=\n## 5|\Z)", text, re.DOTALL)
        if pl_match:
            lines = [line.strip() for line in pl_match.group(1).splitlines() if line.strip() and not line.strip().startswith("#") and not line.strip().startswith("*(")]
            for line in lines:
                if line != "*":
                    parking_lot_items.append(f"[{df}] {line}")

    closure_rate = (total_closed_blocks / total_planned_blocks * 100) if total_planned_blocks > 0 else 0

    print(f"📅 عدد الأيام المسجلة: {total_days} أيام")
    print(f"🎯 إجمالي الكتل المخططة: {total_planned_blocks} كتلة")
    print(f"✅ إجمالي الكتل المغلقة: {total_closed_blocks} كتلة")
    print(f"📈 معدل الإغلاق الأسبوعي: {closure_rate:.1f}%  (الهدف: ≥ 85%)")
    
    if closure_rate >= 85:
        print("🏆 التقييم: أداء استثنائي ومنضبط للغاية!")
    elif closure_rate >= 70:
        print("⚖️ التقييم: أداء جيد مع وجود فجوات تحتاج ضبط.")
    else:
        print("🚨 التقييم: انخفاض في معدل الإغلاق! يرجى فحص الأعطال أدناه وتطبيق ترقيع للنظام.")

    print("\n🔍 تحليل الأعطال المرصودة:")
    print(f"  • Bug A (هندسة مفرطة وتشعب):   {bug_a_count} مرات")
    print(f"  • Bug B (ضبابية معيار الإنجاز): {bug_b_count} مرات")
    print(f"  • Bug C (انهيار الطاقة والضغط):  {bug_c_count} مرات")

    if parking_lot_items:
        print(f"\n💡 أفكار مركونة في سلة الانتظار ({len(parking_lot_items)}):")
        for item in parking_lot_items[:5]:
            print(f"  - {item}")
        if len(parking_lot_items) > 5:
            print(f"  ... و {len(parking_lot_items) - 5} أفكار أخرى.")

    print("\n" + "="*50)
    print("📝 يمكنك نسخ هذه المؤشرات مباشرة إلى ملف:")
    print(f"   {os.path.join(week_dir, 'WEEKLY_REVIEW.md')}")
    print("="*50 + "\n")

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ["today", "open"]:
        cmd_today(open_editor=True)
    elif sys.argv[1] == "audit":
        week_arg = sys.argv[2] if len(sys.argv) > 2 else None
        cmd_audit(week_arg)
    elif sys.argv[1] in ["help", "-h", "--help"]:
        print("استخدام أداة أدرك عمرك CLI:")
        print("  python scripts/adrik_cli.py today  # إنشاء وفتح سجل اليوم")
        print("  python scripts/adrik_cli.py audit  # حساب إحصاءات الأسبوع الحالي")
        print("  python scripts/adrik_cli.py audit 2026-W41 # حساب إحصاءات أسبوع محدد")
    else:
        cmd_today(open_editor=True)

if __name__ == "__main__":
    main()
