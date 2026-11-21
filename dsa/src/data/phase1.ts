import type { Algorithm } from './types'

export const phase1: Algorithm[] = [
  {
    id: 'hashing',
    name: 'Hashing',
    phase: 1,
    tagline: 'Trade memory for O(1) lookups so an inner search loop disappears.',
    idea:
      'Store what you have already seen in a hash set or hash map. Questions like "have I seen X?", "how many X?" or "where was X?" then cost O(1) on average instead of a linear scan.',
    why:
      'Most O(n²) brute forces are an outer loop plus an inner loop that only searches. A hash table answers that search directly, so the inner loop vanishes and the whole solution becomes a single O(n) pass, paid for with O(n) extra memory.',
    cues: [
      'Find a pair / complement ("two numbers that add up to…")',
      'Contains duplicate, first unique, already seen',
      'Count, frequency, most common, anagram',
      'Group items that share a property',
      'Unsorted input with an O(n) requirement (sorting would already cost O(n log n))',
    ],
    pitfalls: [
      'Inserting before checking in complement problems: the element pairs with itself',
      'Using a list as a dict key: convert it to a tuple',
      'Iterating the original array instead of the set when duplicates cause repeated work',
      'Forgetting to state the O(n) space cost in the interview',
    ],
    complexity: 'O(n) time, O(n) space (average case)',
    template: `seen = {}                       # value -> index (or set() for existence)
for i, x in enumerate(nums):
    if target - x in seen:      # 1. check first
        return [seen[target - x], i]
    seen[x] = i                 # 2. then record

from collections import Counter, defaultdict
freq = Counter(nums)            # value -> count
groups = defaultdict(list)      # canonical key -> items
for w in words:
    groups[''.join(sorted(w))].append(w)`,
    prereqs: [],
    groups: [
      {
        structure: 'Array',
        note: 'Remember values (and often their index) as you scan once.',
        questions: [
          { title: 'Contains Duplicate', slug: 'contains-duplicate', level: 'Easy', hints: [
            'Brute force compares every pair. What single question are you really asking for each element?',
            '"Have I seen this value before?" is an existence check: a set answers it in O(1).',
            'Add each value to a set as you go; return True the moment a value is already present.',
          ] },
          { title: 'Two Sum', slug: 'two-sum', level: 'Easy', hints: [
            'For each x, the partner you need is fixed: target − x.',
            'Keep a map of value → index for everything seen so far.',
            'Check for the partner before inserting x, or x can pair with itself.',
          ] },
          { title: 'Top K Frequent Elements', slug: 'top-k-frequent-elements', level: 'Medium', hints: [
            '"Frequent" is a counting cue: build value → count first.',
            'Now you need the k largest counts. Sorting is O(n log n); can you do better?',
            'Bucket sort by count: bucket[c] holds values that appear c times; read buckets from high to low until you have k.',
          ] },
          { title: 'Longest Consecutive Sequence', slug: 'longest-consecutive-sequence', level: 'Medium', hints: [
            'Sorting works in O(n log n). What were you sorting for? To check whether x − 1 exists.',
            'A set answers "does x − 1 exist?" in O(1) without sorting.',
            'Only start counting from x when x − 1 is absent (x starts a run), then walk x+1, x+2… Each number is walked once overall, so O(n).',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Count characters, or map each string to a canonical key that is identical within a group.',
        questions: [
          { title: 'Valid Anagram', slug: 'valid-anagram', level: 'Easy', hints: [
            'Anagram = same characters, same number of times.',
            'Compare character counts of both strings (Counter, or a 26-length array).',
          ] },
          { title: 'Isomorphic Strings', slug: 'isomorphic-strings', level: 'Easy', hints: [
            'Each character of s must map to exactly one character of t, consistently.',
            'One map is not enough: "ab" → "aa" passes a one-way check. Keep s→t and t→s maps.',
          ] },
          { title: 'Group Anagrams', slug: 'group-anagrams', level: 'Medium', hints: [
            '"Group" cue: find a key that is identical for every word in the same group.',
            'The sorted word works as a key ("eat", "tea" → "aet"). A 26-count tuple also works and avoids sorting.',
            'defaultdict(list) from key → words, return the values.',
          ] },
        ],
      },
      {
        structure: 'Matrix',
        note: 'Use one set per row / column / box, or encode the position into the key.',
        questions: [
          { title: 'Valid Sudoku', slug: 'valid-sudoku', level: 'Medium', hints: [
            'Three duplicate checks: each row, each column, each 3×3 box.',
            'The box index for cell (r, c) is (r // 3, c // 3).',
            'Keep a set per row, column and box; a digit already present means invalid.',
          ] },
        ],
      },
      {
        structure: 'Linked List',
        note: 'Hash the node objects themselves (identity), not their values.',
        questions: [
          { title: 'Intersection of Two Linked Lists', slug: 'intersection-of-two-linked-lists', level: 'Easy', hints: [
            'Intersection means the same node object, not the same value.',
            'Put every node of list A in a set; the first node of B found in it is the answer (O(n) space).',
            'Follow-up for O(1) space: two pointers that switch lists at the end meet at the intersection.',
          ] },
          { title: 'Copy List with Random Pointer', slug: 'copy-list-with-random-pointer', level: 'Medium', hints: [
            'The hard part: random may point to a node you have not copied yet.',
            'First pass: map every old node → its new copy.',
            'Second pass: copy.next = map[old.next], copy.random = map[old.random] (handle None).',
          ] },
        ],
      },
    ],
  },

  {
    id: 'two-pointers',
    name: 'Two Pointers',
    phase: 1,
    tagline: 'Two indices that move so each step safely discards candidates.',
    idea:
      'Use two indices instead of nested loops. Either they start at both ends and move inward (sorted arrays, palindromes), or they move in the same direction at different roles (read/write pointer, a gap of n nodes).',
    why:
      'On sorted data, if a[l] + a[r] is too small, every pair using a[l] with anything left of r is also too small, so l can move right without missing an answer. Each move rules out a whole row of pairs, giving O(n) instead of O(n²).',
    cues: [
      'Sorted array + "pair / triplet with a target sum"',
      'Palindrome checks, comparing from both ends',
      '"In place", "O(1) extra space", "remove / move elements"',
      'Linked list "nth from the end" (keep a gap of n)',
    ],
    pitfalls: [
      'Using it on unsorted data where the "discard" argument does not hold (sort first, or use hashing)',
      'Not skipping duplicates in 3Sum, producing repeated triplets',
      'Off-by-one in the loop condition (l < r vs l <= r)',
    ],
    complexity: 'O(n) time after sorting (O(n log n) if you must sort), O(1) space',
    template: `# opposite ends (sorted input)
l, r = 0, len(a) - 1
while l < r:
    s = a[l] + a[r]
    if s == target:
        return [l, r]
    if s < target:
        l += 1
    else:
        r -= 1

# same direction: read pointer i, write pointer w
w = 0
for i in range(len(a)):
    if keep(a[i]):
        a[w] = a[i]
        w += 1`,
    prereqs: ['hashing'],
    groups: [
      {
        structure: 'Array',
        note: 'Opposite-end pointers on sorted data, or read/write pointers for in-place edits.',
        questions: [
          { title: 'Move Zeroes', slug: 'move-zeroes', level: 'Easy', hints: [
            '"In place" cue: one pointer reads, one pointer marks where the next non-zero goes.',
            'Copy (or swap) each non-zero to position w and advance w; everything after w becomes zero.',
          ] },
          { title: 'Remove Duplicates from Sorted Array', slug: 'remove-duplicates-from-sorted-array', level: 'Easy', hints: [
            'Sorted means duplicates are adjacent.',
            'Write a[i] to position w only when it differs from the last written value a[w − 1].',
          ] },
          { title: 'Two Sum II – Input Array Is Sorted', slug: 'two-sum-ii-input-array-is-sorted', level: 'Medium', hints: [
            'Sorted + pair sum: start at both ends.',
            'Too small → move left pointer right; too big → move right pointer left. Argue why no answer is skipped.',
          ] },
          { title: '3Sum', slug: '3sum', level: 'Medium', hints: [
            'Fix one number, then the rest is Two Sum II on the remaining sorted part.',
            'Sort first. For each i, run two pointers on i+1 … end looking for −nums[i].',
            'Skip equal values for i and after a match for l and r, or you will output duplicates.',
          ] },
          { title: 'Container With Most Water', slug: 'container-with-most-water', level: 'Medium', hints: [
            'Area = width × min(height[l], height[r]). Start with the widest container.',
            'Moving the taller side can never help: width shrinks and the min cannot grow. So move the shorter side.',
          ] },
          { title: 'Trapping Rain Water', slug: 'trapping-rain-water', level: 'Hard', hints: [
            'Water above index i = min(max height to its left, max height to its right) − height[i].',
            'Prefix/suffix max arrays give O(n) time and O(n) space. Can two pointers avoid the arrays?',
            'Keep leftMax and rightMax. Whichever side has the smaller max is the bottleneck: settle that side and move it inward.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Compare characters from both ends moving inward.',
        questions: [
          { title: 'Reverse String', slug: 'reverse-string', level: 'Easy', hints: [
            'Swap s[l] and s[r], then move both inward until they meet.',
          ] },
          { title: 'Valid Palindrome', slug: 'valid-palindrome', level: 'Easy', hints: [
            'Compare from both ends, skipping non-alphanumeric characters.',
            'Lower-case before comparing; use str.isalnum() to skip.',
          ] },
          { title: 'Valid Palindrome II', slug: 'valid-palindrome-ii', level: 'Easy', hints: [
            'Run the normal palindrome check until the first mismatch.',
            'At a mismatch you may delete one character: check whether s[l+1..r] or s[l..r−1] is a palindrome.',
          ] },
        ],
      },
      {
        structure: 'Linked List',
        note: 'No random access, so pointers move forward only; use a fixed gap or merge two lists.',
        questions: [
          { title: 'Merge Two Sorted Lists', slug: 'merge-two-sorted-lists', level: 'Easy', hints: [
            'One pointer per list; always take the smaller head.',
            'A dummy head node removes the "which node is the new head?" special case.',
          ] },
          { title: 'Remove Nth Node From End of List', slug: 'remove-nth-node-from-end-of-list', level: 'Medium', hints: [
            'You cannot count backwards, but you can keep two pointers n nodes apart.',
            'Move fast n steps ahead, then move both until fast reaches the end; slow is just before the target.',
            'Start both at a dummy node so removing the head works too.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'fast-slow',
    name: 'Fast & Slow Pointers',
    phase: 1,
    tagline: 'One pointer moves twice as fast: find middles and detect cycles.',
    idea:
      'Move slow one step and fast two steps. When fast reaches the end, slow is at the middle. If there is a cycle, fast eventually laps slow and they meet inside it (Floyd\'s algorithm).',
    why:
      'Inside a cycle, the gap between fast and slow shrinks by exactly one each step, so it must hit zero: they always meet. After they meet, a pointer from the start and a pointer from the meeting point reach the cycle entrance together.',
    cues: [
      'Linked list "cycle", "loop", "where does the cycle begin"',
      '"Middle of the list", "split the list in half"',
      'A sequence where each value determines the next (x → f(x)) that may repeat',
      'O(1) space required where a visited set would otherwise be used',
    ],
    pitfalls: [
      'Loop condition: check fast and fast.next before moving fast two steps',
      'For even-length lists, decide which middle you need and test both cases',
    ],
    complexity: 'O(n) time, O(1) space',
    template: `slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:          # cycle detected
        p = head
        while p is not slow:  # find the cycle start
            p, slow = p.next, slow.next
        return p
return None                   # no cycle (slow is the middle here)`,
    prereqs: ['two-pointers'],
    groups: [
      {
        structure: 'Linked List',
        note: 'The classic home: middles, cycles and halves.',
        questions: [
          { title: 'Middle of the Linked List', slug: 'middle-of-the-linked-list', level: 'Easy', hints: [
            'When fast has gone 2k steps, slow has gone k: half way.',
            'Loop while fast and fast.next; return slow.',
          ] },
          { title: 'Linked List Cycle', slug: 'linked-list-cycle', level: 'Easy', hints: [
            'A visited set works in O(n) space. Can two speeds detect it in O(1)?',
            'If fast ever meets slow, there is a cycle; if fast hits None, there is not.',
          ] },
          { title: 'Linked List Cycle II', slug: 'linked-list-cycle-ii', level: 'Medium', hints: [
            'First detect the meeting point as in Cycle I.',
            'Then move one pointer from head and one from the meeting point, one step each; they meet at the cycle start.',
          ] },
          { title: 'Palindrome Linked List', slug: 'palindrome-linked-list', level: 'Easy', hints: [
            'Find the middle with fast/slow.',
            'Reverse the second half, then compare it node by node with the first half.',
          ] },
          { title: 'Reorder List', slug: 'reorder-list', level: 'Medium', hints: [
            'Three known steps combined: find the middle, reverse the second half, merge alternately.',
            'Cut the list at the middle (slow.next = None) before reversing, or you create a cycle.',
          ] },
        ],
      },
      {
        structure: 'Array / implicit sequence',
        note: 'Treat "value → next value" as a linked list and run Floyd on it.',
        questions: [
          { title: 'Happy Number', slug: 'happy-number', level: 'Easy', hints: [
            'n → sum of squares of digits is a sequence; it either reaches 1 or loops.',
            'Detect the loop with slow = f(n), fast = f(f(n)) instead of a set.',
          ] },
          { title: 'Find the Duplicate Number', slug: 'find-the-duplicate-number', level: 'Medium', hints: [
            'Values are in 1..n, so treat index i → nums[i] as a "next pointer".',
            'The duplicate value is where two indices point to the same place: the entrance of a cycle.',
            'Run Floyd (detect, then find the start) on this implicit list.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'sliding-window',
    name: 'Sliding Window',
    phase: 1,
    tagline: 'Grow and shrink a contiguous window instead of re-scanning every subarray.',
    idea:
      'Keep a window [l, r] over a contiguous range. Extend r one step at a time; when the window breaks the condition, move l forward until it is valid again. Record the answer whenever the window is valid. Fixed-size windows move both ends together.',
    why:
      'Neighbouring subarrays overlap almost entirely. Updating the window state by adding s[r] and removing s[l] is O(1), and each index enters and leaves the window once, so all candidate windows are covered in O(n) instead of O(n²).',
    cues: [
      '"Contiguous subarray" or "substring"',
      'Longest / shortest / count of windows satisfying a condition',
      'At most K distinct, no repeating characters, sum ≥ target, at most K changes',
      'Fixed size k: "every window of size k", "maximum average of k elements"',
    ],
    pitfalls: [
      'The condition must be monotonic: once a window is invalid, growing it must keep it invalid. Negative numbers break sum-based windows (use prefix sums instead)',
      'Updating the answer before the window is made valid again',
      'Forgetting to decrement / delete counts when l moves',
    ],
    complexity: 'O(n) time, O(k) space for the window state',
    notFor:
      'Linked lists rarely use sliding window: there is no index, and the problems that look similar ("nth from end") are solved with two pointers at a fixed gap instead.',
    template: `from collections import defaultdict
count = defaultdict(int)
l = best = 0
for r, ch in enumerate(s):
    count[ch] += 1                  # 1. grow: add s[r]
    while window_is_invalid(count): # 2. shrink until valid
        count[s[l]] -= 1
        l += 1
    best = max(best, r - l + 1)     # 3. window is valid here`,
    prereqs: ['two-pointers', 'hashing'],
    groups: [
      {
        structure: 'Array',
        note: 'Window over numbers: track a sum, a count, or a monotonic deque.',
        questions: [
          { title: 'Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', level: 'Easy', hints: [
            'You buy at some l and sell at a later r: a window.',
            'Keep the minimum price seen so far as the buy day; at each r, profit = price − min.',
          ] },
          { title: 'Maximum Average Subarray I', slug: 'maximum-average-subarray-i', level: 'Easy', hints: [
            'Fixed window size k.',
            'Compute the first window sum, then slide: add nums[r], subtract nums[r − k].',
          ] },
          { title: 'Minimum Size Subarray Sum', slug: 'minimum-size-subarray-sum', level: 'Medium', hints: [
            'All numbers are positive, so a growing window only increases the sum (the condition is monotonic).',
            'Grow r; while sum ≥ target, record the length and shrink from l.',
          ] },
          { title: 'Max Consecutive Ones III', slug: 'max-consecutive-ones-iii', level: 'Medium', hints: [
            'Rephrase: longest window containing at most k zeros.',
            'Count zeros in the window; shrink while zeros > k.',
          ] },
          { title: 'Sliding Window Maximum', slug: 'sliding-window-maximum', level: 'Hard', hints: [
            'Fixed window, but you need its maximum after every slide.',
            'Keep a deque of indices with decreasing values; the front is the current max.',
            'Pop from the back while smaller than the new value; pop from the front when it leaves the window.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Window over characters: track a frequency map of what is inside.',
        questions: [
          { title: 'Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating-characters', level: 'Medium', hints: [
            'Valid window = no character appears twice.',
            'Add s[r]; while its count > 1, remove s[l] and move l.',
            'Optimisation: store last index of each char and jump l directly past it.',
          ] },
          { title: 'Longest Repeating Character Replacement', slug: 'longest-repeating-character-replacement', level: 'Medium', hints: [
            'A window is fixable if (window length − count of its most frequent char) ≤ k.',
            'Track counts and the max frequency; shrink while the window needs more than k replacements.',
          ] },
          { title: 'Permutation in String', slug: 'permutation-in-string', level: 'Medium', hints: [
            'A permutation of s1 is a window of length len(s1) with the same character counts.',
            'Fixed-size window over s2; compare counts (or track how many characters currently match).',
          ] },
          { title: 'Find All Anagrams in a String', slug: 'find-all-anagrams-in-a-string', level: 'Medium', hints: [
            'Same as Permutation in String, but record every start index where counts match.',
          ] },
          { title: 'Minimum Window Substring', slug: 'minimum-window-substring', level: 'Hard', hints: [
            'Need = counts of t. Grow r until the window contains all of t.',
            'Track "formed" = number of characters whose required count is met, so validity is O(1).',
            'While valid, record the window and shrink from l.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'prefix-sum',
    name: 'Prefix Sums',
    phase: 1,
    tagline: 'Precompute running totals so any range sum is one subtraction.',
    idea:
      'prefix[i] = sum of the first i elements. The sum of a range l..r is prefix[r + 1] − prefix[l]. Combined with a hash map of prefixes seen so far, it counts subarrays with a given sum in one pass.',
    why:
      'Every subarray sum is the difference of two prefix sums. "Subarray ending at r with sum k" becomes "an earlier prefix equal to current − k", which a hash map answers in O(1). Unlike sliding window, this works with negative numbers.',
    cues: [
      '"Sum of subarray / range" queried many times',
      '"Number of subarrays with sum k", "divisible by k"',
      'Negative numbers present where a sliding window would fail',
      'Left-of / right-of products or sums at every index',
    ],
    pitfalls: [
      'Forgetting the initial prefix 0 (seen = {0: 1}) so subarrays starting at index 0 are missed',
      'Off-by-one between prefix of length i and index i',
      'Inserting the current prefix before counting matches',
    ],
    complexity: 'O(n) to build, O(1) per range query; O(n) space',
    template: `seen = {0: 1}          # prefix value -> how many times seen
run = ans = 0
for x in nums:
    run += x
    ans += seen.get(run - k, 0)   # earlier prefixes that make sum k
    seen[run] = seen.get(run, 0) + 1`,
    prereqs: ['hashing'],
    groups: [
      {
        structure: 'Array',
        note: 'Running sums or products from the left and/or right.',
        questions: [
          { title: 'Range Sum Query – Immutable', slug: 'range-sum-query-immutable', level: 'Easy', hints: [
            'Many queries on fixed data: precompute once.',
            'prefix has length n + 1; sumRange(l, r) = prefix[r + 1] − prefix[l].',
          ] },
          { title: 'Find Pivot Index', slug: 'find-pivot-index', level: 'Easy', hints: [
            'Left sum at i is a running prefix; right sum = total − left − nums[i].',
          ] },
          { title: 'Product of Array Except Self', slug: 'product-of-array-except-self', level: 'Medium', hints: [
            'Answer[i] = (product of everything left of i) × (product of everything right of i).',
            'One left-to-right pass for prefix products, one right-to-left pass multiplying in suffix products. No division needed.',
          ] },
          { title: 'Subarray Sum Equals K', slug: 'subarray-sum-equals-k', level: 'Medium', hints: [
            'Numbers can be negative, so sliding window breaks.',
            'A subarray ending here has sum k iff an earlier prefix equals current prefix − k.',
            'Count prefixes in a hash map, starting with {0: 1}.',
          ] },
          { title: 'Continuous Subarray Sum', slug: 'continuous-subarray-sum', level: 'Medium', hints: [
            'Sum of l..r is divisible by k iff prefix[r] % k == prefix[l] % k.',
            'Store the first index of each remainder; a repeat at least 2 positions later is the answer. Seed {0: −1}.',
          ] },
        ],
      },
      {
        structure: 'Matrix',
        note: '2D prefix: each cell stores the sum of the rectangle from (0, 0).',
        questions: [
          { title: 'Range Sum Query 2D – Immutable', slug: 'range-sum-query-2d-immutable', level: 'Medium', hints: [
            'P[r][c] = sum of the rectangle from (0,0) to (r−1, c−1).',
            'Build with inclusion–exclusion: P[r][c] = M + P[r−1][c] + P[r][c−1] − P[r−1][c−1].',
            'Query with the same idea: add the big rectangle, subtract two strips, add back the overlap.',
          ] },
        ],
      },
      {
        structure: 'Binary Tree',
        note: 'The prefix is the sum along the current root-to-node path.',
        questions: [
          { title: 'Path Sum III', slug: 'path-sum-iii', level: 'Medium', hints: [
            'A downward path is a contiguous segment of a root-to-node path, exactly like a subarray.',
            'Carry the running sum in DFS and use the Subarray Sum Equals K hash map trick.',
            'Remove the current prefix from the map when returning (backtrack), so other branches do not see it.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'binary-search',
    name: 'Binary Search',
    phase: 1,
    tagline: 'Halve the search space whenever a yes/no answer flips exactly once.',
    idea:
      'If a predicate is False for a prefix of a range and True for the rest, you can find the first True by checking the middle and discarding half each time. The range can be array indices or possible answers (speeds, capacities, days).',
    why:
      'Each check throws away half of the remaining candidates, so n candidates need about log₂ n checks. Monotonicity is what makes discarding a half safe.',
    cues: [
      'Sorted or rotated-sorted input',
      '"Minimum X such that…" / "maximum X such that…"',
      'Feasibility that only gets easier as X grows (if X works, X + 1 works)',
      'Huge value ranges (up to 10⁹) hinting at O(log n)',
    ],
    pitfalls: [
      'Mixing lo <= hi with hi = mid (infinite loop) — pick one convention and keep its invariant',
      'Wrong boundaries when searching on the answer (lo must be feasible-or-less, hi must be feasible)',
      'Using mid + 1 / mid − 1 inconsistently with the invariant',
    ],
    complexity: 'O(log n) checks; total O(cost of check × log range)',
    template: `def first_true(lo, hi, ok):
    # invariant: answer is in [lo, hi]; ok is False...False True...True
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid        # mid could be the answer
        else:
            lo = mid + 1    # answer is to the right
    return lo

from bisect import bisect_left, bisect_right   # built-ins for sorted lists`,
    prereqs: [],
    groups: [
      {
        structure: 'Array',
        note: 'Search over indices of a sorted (or rotated sorted) array.',
        questions: [
          { title: 'Binary Search', slug: 'binary-search', level: 'Easy', hints: [
            'Write it with an explicit invariant: "if target exists, it is in [lo, hi]".',
          ] },
          { title: 'Search Insert Position', slug: 'search-insert-position', level: 'Easy', hints: [
            'You want the first index with nums[i] ≥ target: a first-True search.',
          ] },
          { title: 'Find First and Last Position of Element in Sorted Array', slug: 'find-first-and-last-position-of-element-in-sorted-array', level: 'Medium', hints: [
            'Two first-True searches: first index ≥ target, and first index > target.',
            'Last position = (first index > target) − 1; check the element actually exists.',
          ] },
          { title: 'Find Minimum in Rotated Sorted Array', slug: 'find-minimum-in-rotated-sorted-array', level: 'Medium', hints: [
            'Compare nums[mid] with nums[hi]: which half is sorted?',
            'If nums[mid] > nums[hi], the minimum is to the right of mid; otherwise it is at mid or to its left.',
          ] },
          { title: 'Search in Rotated Sorted Array', slug: 'search-in-rotated-sorted-array', level: 'Medium', hints: [
            'At any mid, at least one half is sorted.',
            'Find the sorted half; if the target lies within its range go there, else go to the other half.',
          ] },
          { title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', level: 'Hard', hints: [
            'Binary search the cut position in the smaller array; the cut in the other array is then determined.',
            'A cut is correct when leftA ≤ rightB and leftB ≤ rightA.',
          ] },
        ],
      },
      {
        structure: 'Matrix',
        note: 'A row-wise sorted matrix can be treated as one flat sorted array.',
        questions: [
          { title: 'Search a 2D Matrix', slug: 'search-a-2d-matrix', level: 'Medium', hints: [
            'The matrix rows concatenated are sorted: index i maps to (i // cols, i % cols).',
          ] },
        ],
      },
      {
        structure: 'Answer space',
        note: 'Binary search a number (speed, capacity, sum) using a feasibility check.',
        questions: [
          { title: 'Koko Eating Bananas', slug: 'koko-eating-bananas', level: 'Medium', hints: [
            'If speed k is enough, any faster speed is too: monotonic.',
            'Search k in [1, max(piles)]; check = sum(ceil(p / k)) ≤ h.',
          ] },
          { title: 'Capacity To Ship Packages Within D Days', slug: 'capacity-to-ship-packages-within-d-days', level: 'Medium', hints: [
            'Search capacity in [max(weights), sum(weights)].',
            'Check greedily: fill a day until the next package would overflow, count days ≤ D.',
          ] },
          { title: 'Split Array Largest Sum', slug: 'split-array-largest-sum', level: 'Hard', hints: [
            'Same shape as shipping packages: binary search the largest allowed subarray sum.',
            'Feasible if a greedy split needs ≤ k subarrays.',
          ] },
        ],
      },
      {
        structure: 'Design',
        note: 'Keep values sorted by time so lookups can bisect.',
        questions: [
          { title: 'Time Based Key-Value Store', slug: 'time-based-key-value-store', level: 'Medium', hints: [
            'Timestamps arrive in increasing order, so each key\'s list is already sorted.',
            'get = the last entry with timestamp ≤ t: bisect_right − 1.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'stack',
    name: 'Stack & Monotonic Stack',
    phase: 1,
    tagline: 'Track the most recent unfinished thing; keep it sorted to find next-greater in O(n).',
    idea:
      'A stack is last-in-first-out: ideal when the most recent open item must be resolved first (brackets, nested expressions). A monotonic stack keeps elements in increasing or decreasing order by popping everything the new element "beats" — each pop is an answer found.',
    why:
      'Every element is pushed once and popped at most once, so even with the inner while loop the total work is O(n). The pop happens exactly when the next greater (or smaller) element arrives.',
    cues: [
      'Matching / nested pairs: brackets, tags, encoded strings',
      'Evaluate expressions, undo, "remove adjacent duplicates"',
      '"Next greater / next smaller element", "how many days until warmer"',
      'Largest rectangle, spans, visibility',
    ],
    pitfalls: [
      'Popping from an empty stack — check before pop',
      'Storing values when you need indices (for distances)',
      'Forgetting to process what is left in the stack at the end',
    ],
    complexity: 'O(n) time, O(n) space',
    template: `res = [0] * len(a)
st = []                         # indices, values kept decreasing
for i, x in enumerate(a):
    while st and a[st[-1]] < x:
        j = st.pop()
        res[j] = i - j          # x is the next greater of a[j]
    st.append(i)`,
    prereqs: [],
    groups: [
      {
        structure: 'String',
        note: 'Push openings, pop on closings; the stack holds what is still unmatched.',
        questions: [
          { title: 'Valid Parentheses', slug: 'valid-parentheses', level: 'Easy', hints: [
            'The most recent unmatched opening bracket must close first: LIFO.',
            'Map each closing bracket to its opener; the stack must be empty at the end.',
          ] },
          { title: 'Remove All Adjacent Duplicates In String', slug: 'remove-all-adjacent-duplicates-in-string', level: 'Easy', hints: [
            'If the new character equals the top of the stack, pop; otherwise push.',
          ] },
          { title: 'Evaluate Reverse Polish Notation', slug: 'evaluate-reverse-polish-notation', level: 'Medium', hints: [
            'Numbers push; an operator pops two, applies, pushes the result.',
            'Order matters for − and /: the first popped is the right operand. Division truncates toward zero: int(a / b).',
          ] },
          { title: 'Decode String', slug: 'decode-string', level: 'Medium', hints: [
            'Nested brackets: each "[" starts a new context to finish later.',
            'On "[", push (current string, repeat count) and reset; on "]", pop and build prev + count × current.',
          ] },
        ],
      },
      {
        structure: 'Array',
        note: 'Monotonic stack of indices: pops reveal next greater / smaller elements.',
        questions: [
          { title: 'Next Greater Element I', slug: 'next-greater-element-i', level: 'Easy', hints: [
            'Compute next greater for every value of nums2 with a decreasing stack, store in a map.',
            'Answer nums1 queries from the map.',
          ] },
          { title: 'Daily Temperatures', slug: 'daily-temperatures', level: 'Medium', hints: [
            '"Days until warmer" = distance to next greater element.',
            'Stack of indices with decreasing temperatures; a warmer day pops and answers them.',
          ] },
          { title: 'Car Fleet', slug: 'car-fleet', level: 'Medium', hints: [
            'Sort cars by position, closest to the target first. Compute each car\'s arrival time.',
            'A car behind that would arrive sooner gets stuck behind the car ahead: same fleet.',
            'Count fleets with a stack of arrival times that only grows.',
          ] },
          { title: 'Largest Rectangle in Histogram', slug: 'largest-rectangle-in-histogram', level: 'Hard', hints: [
            'For each bar, the rectangle using its full height extends until a shorter bar on each side.',
            'Increasing stack of indices: when a shorter bar arrives, pop and compute the popped bar\'s area.',
            'Width = current index − new stack top − 1; add a 0-height bar at the end to flush.',
          ] },
        ],
      },
      {
        structure: 'Design',
        note: 'Augment each stack entry with extra information.',
        questions: [
          { title: 'Min Stack', slug: 'min-stack', level: 'Medium', hints: [
            'Getting the minimum after pops is hard if you only store values.',
            'Store (value, min so far) on each push; the top always knows the current minimum.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'linked-list-ops',
    name: 'In-place Reversal & Dummy Node',
    phase: 1,
    tagline: 'Rewire pointers in place without losing the rest of the list.',
    idea:
      'Reverse a list (or a part of it) by walking with prev / curr / next pointers. A dummy node before the head removes special cases when the head itself may change.',
    why:
      'Each node is visited once and its next pointer flipped, so reversal is O(n) time and O(1) space. Saving curr.next before changing it is what keeps the rest of the list reachable.',
    cues: [
      '"Reverse" a list or a sub-range of it',
      '"In place", "O(1) extra memory" on a linked list',
      'The head might be removed or replaced',
      'Building a new list node by node (sums, merges)',
    ],
    pitfalls: [
      'Overwriting curr.next before saving it (the rest of the list is lost)',
      'Forgetting to reconnect the reversed segment to the parts before and after',
      'Returning head instead of dummy.next',
    ],
    complexity: 'O(n) time, O(1) space',
    template: `prev, curr = None, head
while curr:
    nxt = curr.next     # 1. save
    curr.next = prev    # 2. flip
    prev = curr         # 3. advance
    curr = nxt
return prev             # new head

dummy = ListNode(0, head)   # when the head may change`,
    prereqs: ['two-pointers'],
    groups: [
      {
        structure: 'Linked List',
        note: 'Pointer rewiring with prev / curr / next and a dummy head.',
        questions: [
          { title: 'Reverse Linked List', slug: 'reverse-linked-list', level: 'Easy', hints: [
            'Three pointers: prev, curr, and the saved next.',
            'Save next, flip curr.next to prev, advance both. Return prev.',
          ] },
          { title: 'Add Two Numbers', slug: 'add-two-numbers', level: 'Medium', hints: [
            'Digits are stored least-significant first, exactly the order you add in.',
            'Walk both lists with a carry, appending to a dummy-headed result. Continue while either list or the carry remains.',
          ] },
          { title: 'Swap Nodes in Pairs', slug: 'swap-nodes-in-pairs', level: 'Medium', hints: [
            'Use a dummy; for each pair, rewire prev → second → first → rest.',
            'Draw the three pointer changes before coding.',
          ] },
          { title: 'Reverse Linked List II', slug: 'reverse-linked-list-ii', level: 'Medium', hints: [
            'Walk to the node just before position left (use a dummy in case left = 1).',
            'Reverse exactly right − left + 1 nodes, then reconnect both ends of the reversed segment.',
          ] },
          { title: 'Reverse Nodes in k-Group', slug: 'reverse-nodes-in-k-group', level: 'Hard', hints: [
            'Repeat "Reverse Linked List II" on consecutive blocks of k.',
            'Before reversing a block, check that k nodes remain; otherwise leave it as is.',
          ] },
        ],
      },
      {
        structure: 'Design',
        note: 'Doubly linked list + hash map for O(1) moves.',
        questions: [
          { title: 'LRU Cache', slug: 'lru-cache', level: 'Medium', hints: [
            'You need O(1) lookup (hash map) and O(1) "move to most recent" / "evict least recent".',
            'A doubly linked list with dummy head and tail gives O(1) remove and insert; the map points to nodes.',
          ] },
        ],
      },
    ],
  },
]
