import type { Algorithm } from './types'

export const phase5: Algorithm[] = [
  {
    id: 'intervals',
    name: 'Intervals',
    phase: 5,
    tagline: 'Sort by start (or end), then one pass decides overlap.',
    idea:
      'Sort intervals so that overlapping ones become neighbours. Then walk once, comparing each interval with the last one kept: merge if they overlap, otherwise start a new one. For "how many at once" questions, sweep over start and end events.',
    why:
      'After sorting by start, an interval can only overlap the most recent kept interval, not anything earlier, so a single comparison per interval is enough. Sorting by end time is the safe greedy choice when you want to keep as many non-overlapping intervals as possible.',
    cues: [
      'Input is a list of [start, end] pairs',
      '"Merge", "insert", "overlapping", "free time"',
      '"Minimum rooms / arrows / removals", "max simultaneous"',
    ],
    pitfalls: [
      'Whether touching intervals ([1, 2] and [2, 3]) count as overlapping — read the problem',
      'Mutating the input while iterating over it',
      'Sorting by start when the greedy needs sorting by end (non-overlapping, arrows)',
    ],
    complexity: 'O(n log n) for the sort, O(n) for the pass',
    template: `intervals.sort()
merged = []
for s, e in intervals:
    if merged and s <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], e)
    else:
        merged.append([s, e])`,
    prereqs: ['two-pointers'],
    groups: [
      {
        structure: 'Array of intervals',
        note: 'Sort, then compare with the last kept interval.',
        questions: [
          { title: 'Merge Intervals', slug: 'merge-intervals', level: 'Medium', hints: [
            'Sort by start; overlap means start ≤ end of the last merged interval.',
          ] },
          { title: 'Insert Interval', slug: 'insert-interval', level: 'Medium', hints: [
            'Three phases: intervals entirely before, the ones that overlap (merge into one), intervals entirely after.',
          ] },
          { title: 'Non-overlapping Intervals', slug: 'non-overlapping-intervals', level: 'Medium', hints: [
            'Keep as many as possible: always keep the interval that ends earliest.',
            'Sort by end; count intervals that start before the last kept end — those are removed.',
          ] },
          { title: 'Minimum Number of Arrows to Burst Balloons', slug: 'minimum-number-of-arrows-to-burst-balloons', level: 'Medium', hints: [
            'Sort by end; shoot at the end of the first balloon.',
            'Every balloon starting at or before that point is burst; the next one that starts after needs a new arrow.',
          ] },
          { title: 'Car Pooling', slug: 'car-pooling', level: 'Medium', hints: [
            'Turn each trip into events: +passengers at start, −passengers at end.',
            'Sweep events in location order; capacity is exceeded if the running total ever goes above it.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'greedy',
    name: 'Greedy',
    phase: 5,
    tagline: 'Take the locally best choice — only when you can argue it never hurts.',
    idea:
      'Make the best-looking choice at each step and never undo it. Greedy is fast and simple, but only correct when an "exchange argument" holds: any optimal solution can be changed to include your greedy choice without getting worse.',
    why:
      'If the locally best choice is always part of some optimal solution, committing to it reduces the problem without losing the answer. When that fails (coin change with [1, 3, 4]), you need DP.',
    cues: [
      '"Maximum subarray", "can you reach the end", "minimum jumps"',
      'Choosing / scheduling with a clear "best next" rule (often after sorting)',
      'A DP solution exists but only ever uses the best previous state',
    ],
    pitfalls: [
      'Using greedy without testing a small counterexample',
      'Missing the sort that makes the greedy choice valid',
    ],
    complexity: 'Usually O(n) or O(n log n) with sorting',
    template: `best = cur = nums[0]          # Kadane's algorithm
for x in nums[1:]:
    cur = max(x, cur + x)     # extend the current run or restart at x
    best = max(best, cur)`,
    prereqs: ['dp-1d'],
    groups: [
      {
        structure: 'Array',
        note: 'Keep one running quantity and update it with a local rule.',
        questions: [
          { title: 'Maximum Subarray', slug: 'maximum-subarray', level: 'Medium', hints: [
            'If the running sum becomes negative, it can only hurt what follows: restart.',
          ] },
          { title: 'Jump Game', slug: 'jump-game', level: 'Medium', hints: [
            'Track the farthest index reachable so far.',
            'If you reach an index beyond that farthest point, you are stuck.',
          ] },
          { title: 'Jump Game II', slug: 'jump-game-ii', level: 'Medium', hints: [
            'Think in BFS levels: all indices reachable with j jumps form a window.',
            'When you reach the end of the current window, take a jump and extend to the farthest seen.',
          ] },
          { title: 'Gas Station', slug: 'gas-station', level: 'Medium', hints: [
            'If total gas < total cost, it is impossible.',
            'Otherwise, whenever the tank goes negative, no station up to here can be the start: start at the next one.',
          ] },
          { title: 'Hand of Straights', slug: 'hand-of-straights', level: 'Medium', hints: [
            'The smallest remaining card must start a group.',
            'Count cards; repeatedly take the smallest and consume the next groupSize − 1 consecutive values.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Greedy over character positions or a range of possibilities.',
        questions: [
          { title: 'Partition Labels', slug: 'partition-labels', level: 'Medium', hints: [
            'Record the last index of every character.',
            'Extend the current part to the farthest last index seen; cut when i reaches it.',
          ] },
          { title: 'Valid Parenthesis String', slug: 'valid-parenthesis-string', level: 'Medium', hints: [
            'Track the range of possible open counts [low, high], since "*" can be (, ) or nothing.',
            'If high < 0 fail; clamp low at 0; valid if low == 0 at the end.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'trie',
    name: 'Trie',
    phase: 5,
    tagline: 'A tree of characters where every path from the root spells a prefix.',
    idea:
      'Each node has children keyed by character and a flag for "a word ends here". Inserting or searching a word walks one node per character. All words sharing a prefix share that path.',
    why:
      'Prefix queries cost O(length of the word), independent of how many words are stored. Searching many words at once (Word Search II) walks the trie and the grid together, pruning every path that is not a prefix of some word.',
    cues: [
      '"Prefix", "starts with", "autocomplete"',
      'Many words to search at once, especially in a grid',
      'Wildcard search over a dictionary',
    ],
    pitfalls: [
      'Confusing "prefix exists" with "word exists" (check the end flag)',
      'Word Search II: not removing found words / pruning, causing duplicates or timeouts',
    ],
    complexity: 'O(L) per insert / search; O(total characters) space',
    template: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

def insert(root, word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, TrieNode())
    node.end = True`,
    prereqs: ['tree-dfs', 'hashing'],
    groups: [
      {
        structure: 'String',
        note: 'Insert all words, then walk character by character.',
        questions: [
          { title: 'Implement Trie (Prefix Tree)', slug: 'implement-trie-prefix-tree', level: 'Medium', hints: [
            'search and startsWith walk the same path; only search requires the end flag.',
          ] },
          { title: 'Longest Common Prefix', slug: 'longest-common-prefix', level: 'Easy', hints: [
            'Simple approach: compare character by character across all strings.',
            'Trie view: insert all words; walk from the root while there is exactly one child and no word ends.',
          ] },
          { title: 'Replace Words', slug: 'replace-words', level: 'Medium', hints: [
            'Insert all roots; for each word, walk the trie and stop at the first node marked end.',
          ] },
          { title: 'Design Add and Search Words Data Structure', slug: 'design-add-and-search-words-data-structure', level: 'Medium', hints: [
            'A normal trie, but "." means "try every child": DFS at that position.',
          ] },
        ],
      },
      {
        structure: 'Grid',
        note: 'Walk the trie and the board together.',
        questions: [
          { title: 'Word Search II', slug: 'word-search-ii', level: 'Hard', hints: [
            'Searching each word separately repeats a lot of work.',
            'Insert all words into a trie; DFS from every cell, moving down the trie as you move on the board.',
            'Stop as soon as the current path is not in the trie; remove found words to avoid duplicates.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'bits',
    name: 'Bit Manipulation',
    phase: 5,
    tagline: 'Use XOR, AND and shifts to work on numbers bit by bit.',
    idea:
      'Integers are bits. XOR cancels equal values (a ^ a = 0), x & (x − 1) clears the lowest set bit, x >> 1 drops the lowest bit. Many "find the odd one out" or counting problems become O(1)-space tricks.',
    why:
      'XOR is associative and commutative and x ^ x = 0, so XOR-ing everything leaves only the values that appear an odd number of times.',
    cues: [
      '"Every element appears twice except one"',
      '"Count set bits", "power of two", "reverse bits"',
      'O(1) extra space with values in a known range (missing number)',
    ],
    pitfalls: [
      'Python integers are unbounded: mask with 0xFFFFFFFF when 32-bit behaviour matters',
      'Operator precedence: write (x & 1) == 1 with parentheses',
    ],
    complexity: 'Usually O(n) or O(number of bits), O(1) space',
    template: `res = 0
for x in nums:
    res ^= x            # pairs cancel, the single value remains

count = 0
while n:
    n &= n - 1          # clear the lowest set bit
    count += 1`,
    prereqs: [],
    groups: [
      {
        structure: 'Number / Array',
        note: 'Work on the binary representation.',
        questions: [
          { title: 'Single Number', slug: 'single-number', level: 'Easy', hints: [
            'XOR of a number with itself is 0; XOR everything.',
          ] },
          { title: 'Number of 1 Bits', slug: 'number-of-1-bits', level: 'Easy', hints: [
            'n & (n − 1) removes one set bit each time; count iterations.',
          ] },
          { title: 'Counting Bits', slug: 'counting-bits', level: 'Easy', hints: [
            'bits[i] = bits[i >> 1] + (i & 1): reuse the answer for i with the last bit removed.',
          ] },
          { title: 'Missing Number', slug: 'missing-number', level: 'Easy', hints: [
            'XOR all indices 0..n with all values; everything cancels except the missing number.',
            '(Sum formula n(n + 1)/2 − sum also works.)',
          ] },
          { title: 'Reverse Bits', slug: 'reverse-bits', level: 'Easy', hints: [
            '32 times: shift the result left, add n & 1, shift n right.',
          ] },
          { title: 'Sum of Two Integers', slug: 'sum-of-two-integers', level: 'Medium', hints: [
            'a ^ b adds without carry; (a & b) << 1 is the carry. Repeat until the carry is 0.',
            'In Python, mask to 32 bits and convert back for negative results.',
          ] },
        ],
      },
    ],
  },
]
