import { ExecutionResult, isPyDict, isPyList, pyToString } from '../engine/pythonRuntime';

export interface ConceptBlock {
  title: string;
  description: string;
  code: string;
}

export interface ChallengeCheckResult {
  passed: boolean;
  feedback: string;
}

export interface LessonChapter {
  id: string;
  number: string;
  title: string;
  category: string;
  duration: string;
  summary: string;
  concepts: ConceptBlock[];
  exampleCode: string;
  challenge: {
    title: string;
    goal: string;
    requirements: string[];
    starterCode: string;
    solutionCode: string;
    hint: string;
    verify: (res: ExecutionResult) => ChallengeCheckResult;
  };
  quiz: {
    question: string;
    codeSnippet?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface CheatSheetItem {
  id: string;
  category: 'basics' | 'control' | 'collections' | 'functions';
  categoryLabel: string;
  title: string;
  syntax: string;
  description: string;
  exampleCode: string;
}

export interface PlaygroundTemplate {
  id: string;
  title: string;
  summary: string;
  code: string;
}

export const CURRICULUM: LessonChapter[] = [
  {
    id: 'variables-types',
    number: '01',
    title: '變數與資料型別',
    category: '基礎語法',
    duration: '約 6 分鐘',
    summary: '學習如何用變數儲存資料，並認識 Python 最常用的四種基本型別：整數、浮點數、字串與布林值。',
    concepts: [
      {
        title: '變數賦值與型別自動推斷',
        description: 'Python 不需要事先宣告型別，只要用「=」就能將右側的值指派給左側的變數名稱。',
        code: 'age = 20          # int (整數)\nprice = 99.5      # float (浮點數)\nname = "小晴"     # str (字串)\nis_open = True    # bool (布林值)',
      },
      {
        title: '查看型別與重新賦值',
        description: '使用 type() 可以確認資料目前的型別，變數也可以在程式執行過程中被重新賦予新的值。',
        code: 'score = 80\nscore = score + 15\nprint(score, type(score))',
      },
    ],
    exampleCode: `name = "Python 學習者"
level = 1
progress = 0.25
is_ready = True

print("歡迎：", name)
level = level + 1
print("升級為第", level, "階")
print("型別檢查：", type(progress))`,
    challenge: {
      title: '建立個人學習檔案變數',
      goal: '宣告三個變數來儲存課程資訊，並將它們印出來。',
      requirements: [
        '建立字串變數 course，值設為 "Python"',
        '建立整數變數 hours，值設為 12',
        '建立浮點數變數 rating，值設為 4.9',
        '使用 print() 印出這三個變數',
      ],
      starterCode: `# 請在下方完成變數宣告與輸出
course = ""
hours = 0
rating = 0.0

print(course, hours, rating)
`,
      solutionCode: `course = "Python"
hours = 12
rating = 4.9

print(course, hours, rating)
`,
      hint: '字串需要加上雙引號或單引號，例如 course = "Python"；hours 則是整數 12，不加引號。',
      verify: (res) => {
        if (!res.success) {
          return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        }
        const { course, hours, rating } = res.finalVariables;
        if (course !== 'Python') {
          return { passed: false, feedback: '變數 course 的值必須是字串 "Python"。' };
        }
        if (hours !== 12) {
          return { passed: false, feedback: '變數 hours 的值必須是整數 12。' };
        }
        if (typeof rating !== 'number' || Math.abs(rating - 4.9) > 1e-6) {
          return { passed: false, feedback: '變數 rating 的值必須是浮點數 4.9。' };
        }
        if (res.stdout.length === 0) {
          return { passed: false, feedback: '請記得使用 print() 將結果印在終端機上。' };
        }
        return { passed: true, feedback: '完全正確！你已經掌握變數宣告與基本資料型別。' };
      },
    },
    quiz: {
      question: '執行以下程式碼後，變數 x 的資料型別會是什麼？',
      codeSnippet: 'x = 10\nx = "10"',
      options: ['int（整數）', 'str（字串）', 'float（浮點數）', '會發生型別錯誤'],
      correctIndex: 1,
      explanation: 'Python 屬於動態型別語言，第二行將字串 "10" 重新指派給 x，因此 x 最後的型別是 str。',
    },
  },
  {
    id: 'strings-fstrings',
    number: '02',
    title: '字串處理與 f-string',
    category: '文字操作',
    duration: '約 8 分鐘',
    summary: '運用索引切片、大小寫轉換與現代 Python 最推薦的 f-string，優雅地組合動態文字訊息。',
    concepts: [
      {
        title: 'f-string 格式化字串',
        description: '在引號前加上 f，即可在大括號 {} 內直接嵌入變數或運算式，甚至控制小數位數。',
        code: 'item = "咖啡"\nprice = 85\nprint(f"{item} 售價為 {price} 元")',
      },
      {
        title: '切片 (Slicing) 與常用方法',
        description: '字串支援 [起始:結束] 切片（不含結束索引），以及 .strip() 去除空白、.upper() 轉大寫等方法。',
        code: 'code = "  py-2026  "\nclean = code.strip().upper()\nprint(clean[0:2])  # 輸出 PY',
      },
    ],
    exampleCode: `raw_name = "  alice chen  "
clean_name = raw_name.strip().title()
tasks_done = 7
total_tasks = 10
rate = tasks_done / total_tasks * 100

summary = f"{clean_name} 目前完成進度：{rate:.1f}%"
print(summary)
print("前兩個字元：", clean_name[0:2])`,
    challenge: {
      title: '訂單明細格式化產生器',
      goal: '清理商品名稱前後空白，並用 f-string 組合總價訊息。',
      requirements: [
        '將 raw_product = "  notebook  " 去除空白並轉為全大寫，存到 product',
        '設定 qty = 3、unit_price = 120，計算 total = qty * unit_price',
        '用 f-string 建立變數 message，格式為 "商品: NOTEBOOK, 總價: 360 元"',
        '印出 message',
      ],
      starterCode: `raw_product = "  notebook  "
qty = 3
unit_price = 120

# 請清理文字並計算總價
product = raw_product
total = 0
message = ""

print(message)
`,
      solutionCode: `raw_product = "  notebook  "
qty = 3
unit_price = 120

product = raw_product.strip().upper()
total = qty * unit_price
message = f"商品: {product}, 總價: {total} 元"

print(message)
`,
      hint: '可以串接呼叫 raw_product.strip().upper()，再用 f"商品: {product}, 總價: {total} 元" 組合訊息。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { product, total, message } = res.finalVariables;
        if (product !== 'NOTEBOOK') {
          return { passed: false, feedback: 'product 應為去除空白並轉大寫後的 "NOTEBOOK"。' };
        }
        if (total !== 360) {
          return { passed: false, feedback: 'total 應為 qty * unit_price 的結果 360。' };
        }
        if (message !== '商品: NOTEBOOK, 總價: 360 元') {
          return { passed: false, feedback: 'message 格式不符，請確認為 "商品: NOTEBOOK, 總價: 360 元"。' };
        }
        return { passed: true, feedback: '太棒了！你已熟練字串清理與 f-string 格式化輸出。' };
      },
    },
    quiz: {
      question: '字串 text = "Python" 時，text[1:4] 的結果是什麼？',
      options: ['"Pyt"', '"yth"', '"ytho"', '"tho"'],
      correctIndex: 1,
      explanation: 'Python 索引從 0 開始，且切片 [1:4] 包含索引 1、2、3，不包含結束索引 4，因此是 "yth"。',
    },
  },
  {
    id: 'conditionals',
    number: '03',
    title: '運算子與條件判斷',
    category: '邏輯分支',
    duration: '約 8 分鐘',
    summary: '透過比較運算子與 if / elif / else 結構，讓程式根據不同條件做出正確決策。',
    concepts: [
      {
        title: '縮排決定程式區塊',
        description: 'Python 使用 4 個空格縮排來界定 if 條件成立後要執行的程式碼，冒號「:」不可省略。',
        code: 'temp = 32\nif temp >= 30:\n    print("天氣炎熱，注意補水")\nelse:\n    print("氣溫舒適")',
      },
      {
        title: '多條件 elif 與邏輯組合',
        description: '當有多個互斥區間時使用 elif；若需同時滿足多項條件可用 and，任一滿足可用 or。',
        code: 'age = 16\nhas_ticket = True\nif age >= 12 and has_ticket:\n    print("允許入場")',
      },
    ],
    exampleCode: `score = 86

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "D"

print(f"分數 {score} 分，評等為 {grade}")`,
    challenge: {
      title: '電影票價計算器',
      goal: '根據年齡與會員身份決定票價變數 price。',
      requirements: [
        '題目已提供 age = 15 與 is_member = True',
        '若 age < 12，price 設為 150',
        '若 age >= 65，price 設為 180',
        '其餘情況：若為會員 (is_member 為 True) 設為 240，否則設為 300',
      ],
      starterCode: `age = 15
is_member = True
price = 0

# 請完成條件判斷邏輯


print("票價為：", price)
`,
      solutionCode: `age = 15
is_member = True
price = 0

if age < 12:
    price = 150
elif age >= 65:
    price = 180
elif is_member:
    price = 240
else:
    price = 300

print("票價為：", price)
`,
      hint: '依序檢查 age < 12、elif age >= 65、elif is_member，最後用 else 處理非會員一般票。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { price } = res.finalVariables;
        if (price !== 240) {
          return { passed: false, feedback: `目前 age=15, is_member=True，計算出的 price 應為 240，目前為 ${pyToString(price)}。` };
        }
        return { passed: true, feedback: '邏輯正確！你已成功掌握多層條件分支設計。' };
      },
    },
    quiz: {
      question: '若 x = 5，下列哪一個條件運算式的結果為 True？',
      options: ['x > 5 and x < 10', 'not (x == 5)', 'x >= 5 or x < 0', 'x != 5'],
      correctIndex: 2,
      explanation: 'or 運算子只要左右兩側任一為 True 即成立，因為 x >= 5 為 True，所以整體結果為 True。',
    },
  },
  {
    id: 'for-loops',
    number: '04',
    title: 'for 迴圈與 range()',
    category: '重複結構',
    duration: '約 9 分鐘',
    summary: '使用 for 迴圈搭配 range() 序列，自動化處理重複計算、累加與文字遍歷。',
    concepts: [
      {
        title: 'range(起始, 結束, 步長)',
        description: 'range(5) 會產生 0, 1, 2, 3, 4；range(1, 6) 會產生 1 到 5。注意結束值本身不會被包含。',
        code: 'for i in range(1, 4):\n    print(f"第 {i} 次執行")',
      },
      {
        title: '累加器模式 (Accumulator)',
        description: '在迴圈外先初始化變數 total = 0，於每一輪中用 += 累積數值，是最常見的資料統計技巧。',
        code: 'total = 0\nfor n in range(1, 6):\n    total += n\nprint("總和：", total)',
      },
    ],
    exampleCode: `total = 0
for num in range(2, 11, 2):
    total += num
    print(f"加上 {num} 後，目前總和 = {total}")

print("2 到 10 的偶數總和：", total)`,
    challenge: {
      title: '計算 1 到 100 的奇數總和',
      goal: '使用 for 迴圈與 range() 計算 1 到 100 之間所有奇數的總和。',
      requirements: [
        '使用變數 odd_sum 儲存總和（初始為 0）',
        '利用 for 迴圈加總 1, 3, 5, ..., 99',
        '將結果印出（正確答案應為 2500）',
      ],
      starterCode: `odd_sum = 0

# 請撰寫 for 迴圈加總 1 到 99 的奇數


print("奇數總和：", odd_sum)
`,
      solutionCode: `odd_sum = 0

for n in range(1, 101, 2):
    odd_sum += n

print("奇數總和：", odd_sum)
`,
      hint: 'range(1, 101, 2) 會從 1 開始每次加 2，產生所有小於 101 的奇數。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { odd_sum } = res.finalVariables;
        if (odd_sum !== 2500) {
          return { passed: false, feedback: `odd_sum 應為 2500，目前為 ${pyToString(odd_sum)}。` };
        }
        return { passed: true, feedback: '計算正確！使用 range 步長能讓迴圈簡潔又高效。' };
      },
    },
    quiz: {
      question: 'for i in range(3, 10, 3): 這段迴圈會執行幾次？',
      options: ['2 次', '3 次', '4 次', '7 次'],
      correctIndex: 1,
      explanation: 'range(3, 10, 3) 產生的數字序列為 3、6、9（下一個 12 已超過 10），因此共執行 3 次。',
    },
  },
  {
    id: 'while-loops',
    number: '05',
    title: 'while 迴圈與流程控制',
    category: '重複結構',
    duration: '約 8 分鐘',
    summary: '學習在未知執行次數時使用 while 迴圈，並運用 break 與 continue 精準掌控迴圈節奏。',
    concepts: [
      {
        title: '條件式重複與終止條件',
        description: '只要 while 後方的條件為 True 就會持續執行，因此迴圈內務必更新判斷變數，避免無窮迴圈。',
        code: 'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1',
      },
      {
        title: 'break 與 continue',
        description: 'break 會立刻跳出整個迴圈；continue 則略過本輪剩下的程式碼，直接回到開頭檢查條件。',
        code: 'for n in range(1, 10):\n    if n == 5:\n        break\n    print(n)',
      },
    ],
    exampleCode: `balance = 1000
months = 0

while balance < 1500:
    months += 1
    balance += 180
    if months == 2:
        continue
    print(f"第 {months} 個月餘額：{balance}")

print(f"共需 {months} 個月達標")`,
    challenge: {
      title: '尋找第一個能被 7 和 5 整除的數',
      goal: '從 1 開始往上找，遇到第一個同時能被 5 與 7 整除的正整數時停止，並存入 target。',
      requirements: [
        '使用 while 迴圈從 num = 1 開始遞增檢查',
        '當 num % 5 == 0 and num % 7 == 0 時，將其存到 target 並用 break 跳出',
        '印出 target（正確答案應為 35）',
      ],
      starterCode: `num = 1
target = 0

while True:
    # 請檢查整除條件並適時 break
    num += 1
    if num > 100:
        break

print("找到數字：", target)
`,
      solutionCode: `num = 1
target = 0

while True:
    if num % 5 == 0 and num % 7 == 0:
        target = num
        break
    num += 1

print("找到數字：", target)
`,
      hint: '在 num += 1 之前先檢查 if num % 5 == 0 and num % 7 == 0:，成立就設定 target = num 並 break。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { target } = res.finalVariables;
        if (target !== 35) {
          return { passed: false, feedback: `target 應為 35，目前為 ${pyToString(target)}。` };
        }
        return { passed: true, feedback: '精準控制迴圈！你已學會用 break 提前結束搜尋。' };
      },
    },
    quiz: {
      question: '在迴圈中執行到 continue 時，會發生什麼事？',
      options: [
        '立即結束整個程式',
        '直接跳出目前的迴圈',
        '跳過本輪剩餘程式碼，直接進入下一輪判斷',
        '將迴圈計數器歸零',
      ],
      correctIndex: 2,
      explanation: 'continue 只會跳過「這一次」迭代中後方的程式，接著回到迴圈開頭繼續下一輪。',
    },
  },
  {
    id: 'lists',
    number: '06',
    title: '串列 List 操作與視覺化',
    category: '資料結構',
    duration: '約 10 分鐘',
    summary: '掌握 Python 最核心的有序容器 list，操作索引存取、新增刪除元素，並用逐行視覺化觀察記憶體變化。',
    concepts: [
      {
        title: '建立、讀取與負索引',
        description: '串列用中括號 [] 包住元素，索引 0 代表第一項，-1 代表最後一項，len() 可取得元素總數。',
        code: 'fruits = ["蘋果", "香蕉", "芒果"]\nprint(fruits[0], fruits[-1])\nprint("數量：", len(fruits))',
      },
      {
        title: '動態修改串列內容',
        description: '使用 .append() 在尾端加入元素、.pop() 移除並取出元素，或直接透過索引修改特定位置的值。',
        code: 'nums = [10, 20]\nnums.append(30)\nnums[0] = 99\nlast = nums.pop()',
      },
    ],
    exampleCode: `tasks = ["寫程式", "讀文件"]
tasks.append("做測驗")
tasks[1] = "看範例"

done = tasks.pop(0)
print("已完成：", done)
print("待辦清單：", tasks)`,
    challenge: {
      title: '成績清單篩選與統計',
      goal: '從原始成績清單中篩選出及格分數（>= 60），存入新串列並計算平均。',
      requirements: [
        '原始資料 scores = [55, 72, 88, 43, 95, 60]',
        '建立空串列 passed = []，用迴圈將 >= 60 的分數加入 passed',
        '計算及格者的平均分數存入 avg（提示：sum(passed) / len(passed)）',
      ],
      starterCode: `scores = [55, 72, 88, 43, 95, 60]
passed = []

# 請篩選及格分數到 passed 中


avg = 0
print("及格分數：", passed)
print("及格平均：", avg)
`,
      solutionCode: `scores = [55, 72, 88, 43, 95, 60]
passed = []

for s in scores:
    if s >= 60:
        passed.append(s)

avg = sum(passed) / len(passed)
print("及格分數：", passed)
print("及格平均：", avg)
`,
      hint: '使用 for s in scores: 搭配 if s >= 60: passed.append(s)，最後用 sum(passed) / len(passed)。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { passed, avg } = res.finalVariables;
        if (!isPyList(passed)) {
          return { passed: false, feedback: 'passed 必須是一個串列 (list)。' };
        }
        const expected = [72, 88, 95, 60];
        if (passed.items.length !== 4 || !expected.every((v, idx) => passed.items[idx] === v)) {
          return { passed: false, feedback: 'passed 應包含 [72, 88, 95, 60]。' };
        }
        if (typeof avg !== 'number' || Math.abs(avg - 78.75) > 1e-4) {
          return { passed: false, feedback: 'avg 應為 78.75。' };
        }
        return { passed: true, feedback: '太好了！你已學會遍歷、篩選並統計串列資料。' };
      },
    },
    quiz: {
      question: '若 data = [10, 20, 30, 40]，執行 data.pop(1) 後 data 會變成什麼？',
      options: ['[20, 30, 40]', '[10, 30, 40]', '[10, 20, 30]', '[10, 20, 40]'],
      correctIndex: 1,
      explanation: 'pop(1) 會移除索引為 1 的元素（也就是 20），剩下的串列為 [10, 30, 40]。',
    },
  },
  {
    id: 'dictionaries',
    number: '07',
    title: '字典 Dict 與鍵值結構',
    category: '資料結構',
    duration: '約 9 分鐘',
    summary: '使用大括號建立 Key-Value 對應表，快速查詢、更新資料，並透過 .items() 走訪每一筆紀錄。',
    concepts: [
      {
        title: '鍵值對 (Key-Value) 存取',
        description: '字典透過唯一鍵名存取資料，查詢速度極快。使用 .get(key, 預設值) 可避免找不到鍵時發生 KeyError。',
        code: 'user = {"name": "Ken", "role": "學生"}\nuser["level"] = 3\nprint(user.get("email", "未設定"))',
      },
      {
        title: '遍歷字典內容',
        description: '搭配 for k, v in d.items(): 可以同時取得每組資料的鍵 (key) 與值 (value)。',
        code: 'prices = {"紅茶": 30, "拿鐵": 65}\nfor drink, p in prices.items():\n    print(f"{drink}: {p}元")',
      },
    ],
    exampleCode: `inventory = {"鍵盤": 5, "滑鼠": 8}
inventory["螢幕"] = 3
inventory["鍵盤"] += 2

for item, qty in inventory.items():
    print(f"{item} 庫存剩餘 {qty} 件")`,
    challenge: {
      title: '商品購物車結帳統計',
      goal: '更新商品庫存字典，並加總所有項目的價格總和。',
      requirements: [
        '起始字典 cart = {"牛奶": 65, "麵包": 40}',
        '新增項目 "雞蛋": 85，並將 "麵包" 價格改為 45',
        '計算購物車所有商品總金額，存到變數 total_cost（應為 195）',
      ],
      starterCode: `cart = {"牛奶": 65, "麵包": 40}

# 請新增項目、修改價格並計算總金額
total_cost = 0


print("購物車明細：", cart)
print("總金額：", total_cost)
`,
      solutionCode: `cart = {"牛奶": 65, "麵包": 40}

cart["雞蛋"] = 85
cart["麵包"] = 45
total_cost = sum(cart.values())

print("購物車明細：", cart)
print("總金額：", total_cost)
`,
      hint: '使用 cart["雞蛋"] = 85 新增鍵值，再以 sum(cart.values()) 或 for 迴圈加總。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { cart, total_cost } = res.finalVariables;
        if (!isPyDict(cart)) return { passed: false, feedback: 'cart 必須維持為字典 (dict)。' };
        if (cart.entries.get('s:雞蛋')?.value !== 85) {
          return { passed: false, feedback: '請在 cart 中新增 "雞蛋": 85。' };
        }
        if (cart.entries.get('s:麵包')?.value !== 45) {
          return { passed: false, feedback: '請將 cart["麵包"] 更新為 45。' };
        }
        if (total_cost !== 195) {
          return { passed: false, feedback: `total_cost 應為 195，目前為 ${pyToString(total_cost)}。` };
        }
        return { passed: true, feedback: '完美！字典查詢與統計是資料處理的核心能力。' };
      },
    },
    quiz: {
      question: '當存取字典中不存在的鍵時，使用哪種寫法不會引發 KeyError？',
      options: ['d[key]', 'd.get(key, 0)', 'd.pop(key)', 'd.keys(key)'],
      correctIndex: 1,
      explanation: 'd.get(key, default) 在找不到鍵時會安全回傳預設值（此處為 0），不會讓程式當掉。',
    },
  },
  {
    id: 'functions',
    number: '08',
    title: '函式設計與回傳值',
    category: '模組化程式',
    duration: '約 10 分鐘',
    summary: '將重複邏輯封裝成可重用的 def 函式，理解參數傳遞、預設值與 return 回傳機制的運作方式。',
    concepts: [
      {
        title: '定義函式與 return',
        description: 'def 用於建立函式，return 會將計算結果回傳給呼叫端並結束函式執行。記得區分 print()（印出畫面）與 return（回傳數值）。',
        code: 'def area(w, h):\n    return w * h\n\nresult = area(5, 8)\nprint("面積：", result)',
      },
      {
        title: '預設參數值',
        description: '為參數設定預設值後，呼叫函式時若未傳入該參數，會自動採用預設值。',
        code: 'def greet(name, prefix="你好"):\n    return f"{prefix}，{name}！"\n\nprint(greet("小美"))',
      },
    ],
    exampleCode: `def calc_bmi(weight, height_cm):
    height_m = height_cm / 100
    bmi = weight / (height_m ** 2)
    return round(bmi, 1)

my_bmi = calc_bmi(65, 172)
print("計算結果 BMI =", my_bmi)`,
    challenge: {
      title: '撰寫折扣價格計算函式',
      goal: '定義一個 apply_discount(price, rate=0.9) 函式，回傳折後整數價格。',
      requirements: [
        '定義函式 apply_discount(price, rate=0.9)',
        '函式內回傳 int(price * rate)',
        '分別呼叫 apply_discount(1000) 存到 p1，以及 apply_discount(1000, 0.8) 存到 p2',
      ],
      starterCode: `# 請定義 apply_discount 函式


p1 = 0
p2 = 0
print("預設九折：", p1)
print("八折優惠：", p2)
`,
      solutionCode: `def apply_discount(price, rate=0.9):
    return int(price * rate)

p1 = apply_discount(1000)
p2 = apply_discount(1000, 0.8)
print("預設九折：", p1)
print("八折優惠：", p2)
`,
      hint: '函式開頭寫 def apply_discount(price, rate=0.9):，內部寫 return int(price * rate)。',
      verify: (res) => {
        if (!res.success) return { passed: false, feedback: `程式發生錯誤：${res.error?.message}` };
        const { p1, p2 } = res.finalVariables;
        if (p1 !== 900) {
          return { passed: false, feedback: `p1 呼叫 apply_discount(1000) 應回傳 900，目前為 ${pyToString(p1)}。` };
        }
        if (p2 !== 800) {
          return { passed: false, feedback: `p2 呼叫 apply_discount(1000, 0.8) 應回傳 800，目前為 ${pyToString(p2)}。` };
        }
        return { passed: true, feedback: '恭喜完成全部 8 個章節挑戰！你已具備紮實的 Python 基礎。' };
      },
    },
    quiz: {
      question: '如果一個函式內部只寫了 print(x) 而沒有寫 return，呼叫它並指派給變數 res 時，res 的值會是什麼？',
      options: ['0', 'x 的值', 'None', '會產生 SyntaxError'],
      correctIndex: 2,
      explanation: '在 Python 中，沒有寫 return 敘述（或只寫 return）的函式，預設都會回傳特殊空值 None。',
    },
  },
];

export const PLAYGROUND_TEMPLATES: PlaygroundTemplate[] = [
  {
    id: 'multiplication-table',
    title: '九九乘法表精華版',
    summary: '雙層 for 迴圈搭配 f-string 格式化對齊輸出。',
    code: `for i in range(2, 5):
    row = ""
    for j in range(1, 10):
        row += f"{i}x{j}={i*j:2}  "
    print(row)`,
  },
  {
    id: 'fibonacci',
    title: '費氏數列產生器',
    summary: '使用解構賦值 (a, b = b, a + b) 生成前 10 項數列。',
    code: `fib = []
a, b = 0, 1

for _ in range(10):
    fib.append(a)
    a, b = b, a + b

print("前 10 項費氏數列：", fib)`,
  },
  {
    id: 'grade-stats',
    title: '班級成績字典分析',
    summary: '結合字典遍歷與函式計算最高分與平均分。',
    code: `scores = {"小嵐": 92, "阿哲": 78, "米雪": 85, "子軒": 96}

def analyze(data):
    values = list(data.values())
    avg = round(sum(values) / len(values), 1)
    top_name = ""
    top_score = -1
    for name, s in data.items():
        if s > top_score:
            top_score = s
            top_name = name
    return avg, top_name, top_score

average, best_student, best_score = analyze(scores)
print(f"全班平均：{average} 分")
print(f"最高分：{best_student} ({best_score} 分)")`,
  },
  {
    id: 'prime-finder',
    title: '質數篩選函式',
    summary: '透過 while / for 與布林旗標找出 30 以內的所有質數。',
    code: `def is_prime(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            return False
    return True

primes = [n for n in range(2, 31) if is_prime(n)]
print("30 以內的質數：", primes)`,
  },
];

export const SYNTAX_CHEATSHEET: CheatSheetItem[] = [
  {
    id: 'cs-var',
    category: 'basics',
    categoryLabel: '基礎與型別',
    title: '基本資料型別與轉型',
    syntax: 'int("42"), float(3), str(100), bool(1)',
    description: '將資料在整數、浮點數、字串與布林值之間安全轉換，常用於處理使用者輸入或數學計算。',
    exampleCode: `age_str = "24"\nage = int(age_str)\nprint(age + 1, type(age))`,
  },
  {
    id: 'cs-fstring',
    category: 'basics',
    categoryLabel: '基礎與型別',
    title: 'f-string 格式化',
    syntax: 'f"{變數:.2f}"',
    description: '在字串前加 f，大括號內可放入變數、運算式與小數位數格式控制。',
    exampleCode: `pi = 3.1415926\nprint(f"圓周率約為 {pi:.2f}")`,
  },
  {
    id: 'cs-if',
    category: 'control',
    categoryLabel: '條件與迴圈',
    title: 'if / elif / else 分支',
    syntax: 'if 條件: ... elif 條件: ... else: ...',
    description: '由上而下依序檢查條件，只要其中一個成立就執行該區塊並略過後續分支。',
    exampleCode: `battery = 18\nif battery < 20:\n    print("電量偏低，請充電")\nelse:\n    print("電量充足")`,
  },
  {
    id: 'cs-for-range',
    category: 'control',
    categoryLabel: '條件與迴圈',
    title: 'for 與 range() 計數迴圈',
    syntax: 'for i in range(start, stop, step):',
    description: '產生從 start 到 stop - 1 的整數序列，適合固定次數或有規律步長的重複執行。',
    exampleCode: `for i in range(10, 0, -3):\n    print("倒數：", i)`,
  },
  {
    id: 'cs-list-ops',
    category: 'collections',
    categoryLabel: '串列與字典',
    title: 'List 常用增刪與切片',
    syntax: 'lst.append(x) / lst.pop() / lst[1:3]',
    description: '串列是有序且可修改的序列，支援負索引存取與切片擷取子串列。',
    exampleCode: `nums = [10, 20, 30]\nnums.append(40)\nprint("前兩項：", nums[:2])\nprint("最後一項：", nums[-1])`,
  },
  {
    id: 'cs-list-comp',
    category: 'collections',
    categoryLabel: '串列與字典',
    title: '串列生成式 (List Comprehension)',
    syntax: '[運算式 for 變數 in 序列 if 條件]',
    description: '用一行簡潔的語法快速轉換或篩選串列元素，是 Python 最具代表性的語法糖之一。',
    exampleCode: `squares = [n ** 2 for n in range(1, 6)]\nevens = [n for n in squares if n % 2 == 0]\nprint("平方：", squares)\nprint("偶數平方：", evens)`,
  },
  {
    id: 'cs-dict',
    category: 'collections',
    categoryLabel: '串列與字典',
    title: 'Dict 鍵值讀取與走訪',
    syntax: 'd.get(k, default) / d.items()',
    description: '透過唯一鍵名儲存結構化資料，使用 .get() 可安全讀取不存在的鍵。',
    exampleCode: `menu = {"紅茶": 30, "綠茶": 30}\nmenu["烏龍茶"] = 35\nfor k, v in menu.items():\n    print(k, v)`,
  },
  {
    id: 'cs-def',
    category: 'functions',
    categoryLabel: '函式與內建工具',
    title: 'def 函式定義與預設參數',
    syntax: 'def name(arg, opt=10): return ...',
    description: '封裝可重複利用的程式邏輯，透過 return 將結果傳回外部呼叫處。',
    exampleCode: `def power(base, exp=2):\n    return base ** exp\n\nprint(power(5), power(2, 5))`,
  },
  {
    id: 'cs-enumerate-zip',
    category: 'functions',
    categoryLabel: '函式與內建工具',
    title: 'enumerate() 與 zip()',
    syntax: 'for idx, val in enumerate(lst):',
    description: 'enumerate 可同時取得索引與元素；zip 可將兩個串列成對打包遍歷。',
    exampleCode: `names = ["小安", "小宇"]\nscores = [90, 85]\nfor i, (n, s) in enumerate(zip(names, scores), 1):\n    print(f"第 {i} 位 {n}：{s} 分")`,
  },
];
