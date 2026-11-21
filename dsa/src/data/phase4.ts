import type { Algorithm } from './types'

export const phase4: Algorithm[] = [
  {
    id: 'dp-1d',
    name: '1D Dynamic Programming',
    phase: 4,
    tagline: 'Recursion that repeats itself — solve each subproblem once and store it.',
    idea:
      'When a brute-force recursion calls the same subproblem many times, store each answer. Top-down: recursion plus a cache. Bottom-up: fill a table from the smallest state upward. 1D means the state is one number, usually "the first i items" or "ending at i".',
    why:
      'Two conditions make it work: overlapping subproblems (the same state is reached many ways) and optimal substructure (the best answer is built from best answers to smaller states). Caching turns an exponential recursion tree into one computation per state.',
    cues: [
      '"Number of ways", "minimum / maximum cost", "can you reach / form"',
      'At each step you make a choice, and earlier choices limit later ones',
      'The brute force is an exponential recursion (try take / skip)',
      'Greedy fails on a small counterexample',
    ],
    pitfalls: [
      'Defining the state vaguely — write it as one sentence: "dp[i] = …"',
      'Wrong base cases (dp[0] for an empty prefix is often 1 for counting, 0 for cost)',
      'Filling the table in an order where dp[i] needs values not computed yet',
    ],
    complexity: 'O(states × work per state); often O(n) or O(n · k)',
    template: `from functools import lru_cache

@lru_cache(None)
def best(i):                     # state: best answer from index i onward
    if i >= len(nums):
        return 0                 # base case
    return max(best(i + 1),            # skip i
               nums[i] + best(i + 2))  # take i

# bottom-up with O(1) space
prev2 = prev1 = 0
for x in nums:
    prev2, prev1 = prev1, max(prev1, prev2 + x)`,
    prereqs: ['recursion'],
    groups: [
      {
        structure: 'Array',
        note: 'State: best answer for the first i elements, or for subarrays ending at i.',
        questions: [
          { title: 'Climbing Stairs', slug: 'climbing-stairs', level: 'Easy', hints: [
            'To reach step n you came from n − 1 or n − 2.',
            'ways(n) = ways(n − 1) + ways(n − 2): Fibonacci in disguise.',
          ] },
          { title: 'Min Cost Climbing Stairs', slug: 'min-cost-climbing-stairs', level: 'Easy', hints: [
            'dp[i] = cost[i] + min(dp[i − 1], dp[i − 2]); the top is past the last step.',
          ] },
          { title: 'House Robber', slug: 'house-robber', level: 'Medium', hints: [
            'At each house: rob it (add value, skip the previous) or skip it.',
            'dp[i] = max(dp[i − 1], dp[i − 2] + nums[i]); only two values are needed.',
          ] },
          { title: 'House Robber II', slug: 'house-robber-ii', level: 'Medium', hints: [
            'The circle means the first and last house cannot both be robbed.',
            'Run House Robber on nums[1:] and nums[:-1]; take the max (watch n = 1).',
          ] },
          { title: 'Coin Change', slug: 'coin-change', level: 'Medium', hints: [
            'Greedy (largest coin first) fails: coins [1, 3, 4], amount 6.',
            'dp[a] = fewest coins for amount a = 1 + min(dp[a − c]) over coins c ≤ a.',
          ] },
          { title: 'Maximum Product Subarray', slug: 'maximum-product-subarray', level: 'Medium', hints: [
            'A negative number turns the smallest product into the largest.',
            'Track both the max and the min product ending at i.',
          ] },
          { title: 'Longest Increasing Subsequence', slug: 'longest-increasing-subsequence', level: 'Medium', hints: [
            'dp[i] = length of the longest increasing subsequence ending at i = 1 + max(dp[j]) for j < i with nums[j] < nums[i].',
            'O(n log n) follow-up: keep "smallest tail for each length" and binary search.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'State: answer for the prefix s[:i].',
        questions: [
          { title: 'Decode Ways', slug: 'decode-ways', level: 'Medium', hints: [
            'The last step used either one digit (1–9) or two digits (10–26).',
            'dp[i] = (dp[i − 1] if s[i − 1] ≠ "0") + (dp[i − 2] if s[i−2:i] is 10–26); dp[0] = 1.',
          ] },
          { title: 'Word Break', slug: 'word-break', level: 'Medium', hints: [
            'dp[i] = can s[:i] be segmented?',
            'dp[i] is True if some dp[j] is True and s[j:i] is in the dictionary.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'dp-2d',
    name: '2D Dynamic Programming',
    phase: 4,
    tagline: 'When one index is not enough: grids, two strings, item + capacity.',
    idea:
      'Same method as 1D DP, but the state needs two numbers: a cell (r, c), positions i and j in two strings, a range [i, j] of one string, or an item index plus remaining capacity (knapsack).',
    why:
      'Each state is computed once from a few neighbouring states, so the total cost is the size of the table. Often only the previous row is needed, which reduces space to one dimension.',
    cues: [
      'Grid paths with moves right/down',
      'Two strings: common subsequence, edit distance, interleaving',
      '"Subset with a target sum", "number of ways to make amount" (knapsack)',
      'Palindromic substrings / ranges of one string',
    ],
    pitfalls: [
      'Using 1-indexed dp with 0-indexed strings inconsistently (dp[i][j] usually means a[:i], b[:j])',
      '0/1 knapsack in 1D: iterate capacity from high to low so items are not reused',
      'Unbounded knapsack: iterate capacity low to high; for counting combinations loop coins outside',
    ],
    complexity: 'O(n · m) time, O(n · m) or O(m) space',
    template: `n, m = len(a), len(b)
dp = [[0] * (m + 1) for _ in range(n + 1)]   # dp[i][j]: answer for a[:i], b[:j]
for i in range(1, n + 1):
    for j in range(1, m + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
return dp[n][m]`,
    prereqs: ['dp-1d'],
    groups: [
      {
        structure: 'Grid',
        note: 'dp[r][c] from the cell above and the cell to the left.',
        questions: [
          { title: 'Unique Paths', slug: 'unique-paths', level: 'Medium', hints: [
            'You arrive at (r, c) from above or from the left.',
            'dp[r][c] = dp[r − 1][c] + dp[r][c − 1]; the first row and column are all 1.',
          ] },
          { title: 'Unique Paths II', slug: 'unique-paths-ii', level: 'Medium', hints: [
            'Same recurrence; an obstacle cell has 0 ways.',
          ] },
          { title: 'Minimum Path Sum', slug: 'minimum-path-sum', level: 'Medium', hints: [
            'dp[r][c] = grid[r][c] + min(above, left).',
          ] },
        ],
      },
      {
        structure: 'Two Strings',
        note: 'dp[i][j] for the prefixes a[:i] and b[:j].',
        questions: [
          { title: 'Longest Common Subsequence', slug: 'longest-common-subsequence', level: 'Medium', hints: [
            'Look at the last characters of both prefixes.',
            'Equal → 1 + dp[i − 1][j − 1]; otherwise drop one: max(dp[i − 1][j], dp[i][j − 1]).',
          ] },
          { title: 'Edit Distance', slug: 'edit-distance', level: 'Medium', hints: [
            'Last characters equal → no cost: dp[i − 1][j − 1].',
            'Otherwise 1 + min(insert dp[i][j − 1], delete dp[i − 1][j], replace dp[i − 1][j − 1]).',
            'Base cases: converting to/from an empty string costs its length.',
          ] },
          { title: 'Interleaving String', slug: 'interleaving-string', level: 'Medium', hints: [
            'dp[i][j] = can s1[:i] and s2[:j] form s3[:i + j]?',
            'True if the last char of s3 matches s1[i − 1] with dp[i − 1][j], or s2[j − 1] with dp[i][j − 1].',
          ] },
          { title: 'Distinct Subsequences', slug: 'distinct-subsequences', level: 'Hard', hints: [
            'dp[i][j] = ways to form t[:j] from s[:i].',
            'Always dp[i − 1][j] (skip s[i − 1]); add dp[i − 1][j − 1] when s[i − 1] == t[j − 1]. dp[i][0] = 1.',
          ] },
        ],
      },
      {
        structure: 'Knapsack (array + target)',
        note: 'State: (items considered, remaining capacity / target).',
        questions: [
          { title: 'Partition Equal Subset Sum', slug: 'partition-equal-subset-sum', level: 'Medium', hints: [
            'Rephrase: is there a subset with sum total / 2? (odd total → False)',
            '0/1 knapsack: dp[s] = reachable sum; for each number, update s from high to low.',
          ] },
          { title: 'Target Sum', slug: 'target-sum', level: 'Medium', hints: [
            'Plus set P and minus set N: P − N = target and P + N = total, so P = (target + total) / 2.',
            'Count subsets with that sum (0/1 knapsack counting).',
          ] },
          { title: 'Coin Change II', slug: 'coin-change-ii', level: 'Medium', hints: [
            'Count combinations, not orderings: loop coins on the outside, amounts inside.',
            'dp[a] += dp[a − coin]; dp[0] = 1.',
          ] },
        ],
      },
      {
        structure: 'Single String (ranges)',
        note: 'State: whether / how the substring s[i..j] works.',
        questions: [
          { title: 'Palindromic Substrings', slug: 'palindromic-substrings', level: 'Medium', hints: [
            's[i..j] is a palindrome if the ends match and s[i+1..j−1] is a palindrome.',
            'Simpler O(1)-space version: expand around every centre (2n − 1 centres) and count.',
          ] },
          { title: 'Longest Palindromic Substring', slug: 'longest-palindromic-substring', level: 'Medium', hints: [
            'Same structure as Palindromic Substrings; track the longest instead of counting.',
          ] },
        ],
      },
      {
        structure: 'State Machine',
        note: 'The second dimension is a small set of states (holding, not holding, cooling down).',
        questions: [
          { title: 'Best Time to Buy and Sell Stock with Cooldown', slug: 'best-time-to-buy-and-sell-stock-with-cooldown', level: 'Medium', hints: [
            'Each day you are in one of three states: holding, just sold (cooldown), or resting.',
            'Write each state\'s transition from yesterday\'s states, then keep three variables.',
          ] },
        ],
      },
    ],
  },
]
