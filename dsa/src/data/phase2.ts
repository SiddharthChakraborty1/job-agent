import type { Algorithm } from './types'

export const phase2: Algorithm[] = [
  {
    id: 'recursion',
    name: 'Recursion',
    phase: 2,
    tagline: 'Trust the smaller call; write only the base case and the combine step.',
    idea:
      'Define the answer for an input in terms of the answer for a smaller input of the same kind, and stop at a base case you can answer directly. The call stack keeps the in-progress state for you.',
    why:
      'The "leap of faith": assume the recursive call already returns the right answer for the smaller input. Then you only need to prove two things — the base case is right, and the combine step turns a correct smaller answer into a correct answer. This is induction, and it is how every tree, backtracking and DP solution is reasoned about.',
    cues: [
      'The input contains a smaller version of itself (rest of a list, a subtree, n − 1)',
      'The structure is naturally nested (trees, nested lists, expressions)',
      'A brute force that "tries a choice, then solves the rest"',
    ],
    pitfalls: [
      'Missing or wrong base case → infinite recursion',
      'Tracing every call instead of trusting the contract',
      'Python\'s default recursion limit (~1000): deep linked lists can overflow',
      'Forgetting the call stack counts as O(depth) space',
    ],
    complexity: 'Time = number of calls × work per call; space = maximum depth',
    template: `def solve(x):
    # contract: returns <the answer> for input x
    if is_base(x):
        return base_answer(x)
    smaller = solve(shrink(x))      # trust it
    return combine(x, smaller)`,
    prereqs: [],
    groups: [
      {
        structure: 'Math',
        note: 'Reduce n to a smaller n.',
        questions: [
          { title: 'Fibonacci Number', slug: 'fibonacci-number', level: 'Easy', hints: [
            'Base cases n = 0 and n = 1; otherwise f(n − 1) + f(n − 2).',
            'Draw the recursion tree for n = 5: which calls repeat? That repetition is what DP removes.',
          ] },
          { title: 'Pow(x, n)', slug: 'powx-n', level: 'Medium', hints: [
            'x^n = (x^(n/2))² for even n — one call instead of n multiplications.',
            'Odd n: multiply by one extra x. Negative n: compute 1 / x^(−n).',
          ] },
        ],
      },
      {
        structure: 'Linked List',
        note: 'A list is a node plus a smaller list.',
        questions: [
          { title: 'Reverse Linked List (recursively)', slug: 'reverse-linked-list', level: 'Easy', hints: [
            'Trust reverse(head.next) to reverse the rest and return its new head.',
            'After the call, head.next is the tail of the reversed rest: set head.next.next = head, head.next = None.',
          ] },
          { title: 'Merge Two Sorted Lists (recursively)', slug: 'merge-two-sorted-lists', level: 'Easy', hints: [
            'The smaller head comes first; its next is the merge of everything else.',
            'Base case: one list is empty → return the other.',
          ] },
          { title: 'Swap Nodes in Pairs (recursively)', slug: 'swap-nodes-in-pairs', level: 'Medium', hints: [
            'Swap the first two nodes, and trust the call to swap the rest starting from the third.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'tree-dfs',
    name: 'Tree DFS',
    phase: 2,
    tagline: 'Ask what the function returns for a node, assuming it works for the children.',
    idea:
      'Depth-first recursion on a node with two children. Three shapes cover almost everything: return information up (height, sum), pass information down (bounds, running path sum), or keep a global answer that differs from what you return (diameter, max path sum).',
    why:
      'A tree is a root plus two smaller trees, so recursion fits exactly. Post-order (children first) is natural when a node needs its children\'s results; pre-order when children need information from the parent.',
    cues: [
      'Almost any binary tree question: depth, balance, paths, ancestors, comparisons',
      'BST: "validate", "kth smallest", "range" (in-order is sorted)',
      '"Path" questions: root-to-leaf passes info down; any-node-to-any-node uses a global answer',
    ],
    pitfalls: [
      'Returning the global answer instead of what the parent needs (diameter: return height, track diameter)',
      'Validating a BST by only comparing a node with its children (must use bounds)',
      'Forgetting the None base case',
    ],
    complexity: 'O(n) time, O(h) space (h = height; O(n) when skewed)',
    template: `def dfs(node):
    if not node:
        return 0                     # base case
    left = dfs(node.left)            # trust the children
    right = dfs(node.right)
    # optional: update a global answer using left and right here
    return 1 + max(left, right)      # what the parent needs`,
    prereqs: ['recursion'],
    groups: [
      {
        structure: 'Binary Tree',
        note: 'Decide: return up, pass down, or track a global answer.',
        questions: [
          { title: 'Maximum Depth of Binary Tree', slug: 'maximum-depth-of-binary-tree', level: 'Easy', hints: [
            'Contract: depth(node) = height of the tree rooted at node.',
            'Base: None → 0. Combine: 1 + max(left, right).',
          ] },
          { title: 'Invert Binary Tree', slug: 'invert-binary-tree', level: 'Easy', hints: [
            'Swap the children of the current node, and trust the calls to invert each subtree.',
          ] },
          { title: 'Same Tree', slug: 'same-tree', level: 'Easy', hints: [
            'Both None → True; one None or values differ → False; otherwise both subtree pairs must match.',
          ] },
          { title: 'Subtree of Another Tree', slug: 'subtree-of-another-tree', level: 'Easy', hints: [
            'Reuse Same Tree: at every node of root, check sameTree(node, subRoot).',
          ] },
          { title: 'Path Sum', slug: 'path-sum', level: 'Easy', hints: [
            'Pass the remaining sum down: target − node.val.',
            'Only check at a leaf (both children None).',
          ] },
          { title: 'Balanced Binary Tree', slug: 'balanced-binary-tree', level: 'Easy', hints: [
            'Computing height separately at every node is O(n²).',
            'Return the height, or −1 to signal "already unbalanced", in a single post-order pass.',
          ] },
          { title: 'Diameter of Binary Tree', slug: 'diameter-of-binary-tree', level: 'Easy', hints: [
            'The longest path through a node = left height + right height.',
            'Return height to the parent, but update a global best with left + right at every node.',
          ] },
          { title: 'Count Good Nodes in Binary Tree', slug: 'count-good-nodes-in-binary-tree', level: 'Medium', hints: [
            'Pass the maximum value seen on the path down.',
            'A node is good if node.val ≥ that max; update the max for its children.',
          ] },
          { title: 'Lowest Common Ancestor of a Binary Tree', slug: 'lowest-common-ancestor-of-a-binary-tree', level: 'Medium', hints: [
            'Contract: return p or q if found in this subtree, the LCA if both are, else None.',
            'If node is p or q, return it. If both children return non-None, node is the LCA.',
          ] },
          { title: 'Construct Binary Tree from Preorder and Inorder Traversal', slug: 'construct-binary-tree-from-preorder-and-inorder-traversal', level: 'Medium', hints: [
            'preorder[0] is the root; its position in inorder splits left and right subtrees.',
            'Map value → inorder index for O(1) splits; recurse with index ranges instead of slicing.',
          ] },
          { title: 'Binary Tree Maximum Path Sum', slug: 'binary-tree-maximum-path-sum', level: 'Hard', hints: [
            'Same shape as diameter: return one branch to the parent, track the best "bend" globally.',
            'Return node.val + max(0, left, right); global = max(global, node.val + max(0,left) + max(0,right)).',
          ] },
          { title: 'Serialize and Deserialize Binary Tree', slug: 'serialize-and-deserialize-binary-tree', level: 'Hard', hints: [
            'Pre-order with an explicit marker for None makes the tree unambiguous.',
            'Deserialize by consuming tokens in the same pre-order with an iterator.',
          ] },
        ],
      },
      {
        structure: 'Binary Search Tree',
        note: 'left < node < right everywhere: in-order is sorted, and you can go one way only.',
        questions: [
          { title: 'Search in a Binary Search Tree', slug: 'search-in-a-binary-search-tree', level: 'Easy', hints: [
            'Compare with node.val and go left or right — never both.',
          ] },
          { title: 'Lowest Common Ancestor of a Binary Search Tree', slug: 'lowest-common-ancestor-of-a-binary-search-tree', level: 'Medium', hints: [
            'If both values are smaller, go left; both larger, go right.',
            'The first node where they split (or equal one of them) is the LCA.',
          ] },
          { title: 'Validate Binary Search Tree', slug: 'validate-binary-search-tree', level: 'Medium', hints: [
            'Comparing a node only with its children misses violations deeper down.',
            'Pass (low, high) bounds down: left child gets (low, node.val), right gets (node.val, high).',
          ] },
          { title: 'Kth Smallest Element in a BST', slug: 'kth-smallest-element-in-a-bst', level: 'Medium', hints: [
            'In-order traversal visits values in sorted order.',
            'Count nodes as you visit in-order; stop at the kth (iterative with a stack makes stopping easy).',
          ] },
        ],
      },
    ],
  },

  {
    id: 'tree-bfs',
    name: 'Tree BFS',
    phase: 2,
    tagline: 'Process the tree one level at a time with a queue.',
    idea:
      'Put the root in a queue. Repeatedly take the current queue size as one level, pop that many nodes, and push their children. Each loop iteration handles exactly one level.',
    why:
      'A queue is first-in-first-out, so every node at depth d is processed before any node at depth d + 1. That makes "per level" and "closest to the root" questions direct.',
    cues: [
      '"Level", "level order", "zigzag"',
      '"Right side view", "leftmost value"',
      '"Minimum depth", "nearest leaf" — BFS can stop at the first leaf it meets',
    ],
    pitfalls: [
      'Not freezing the level size before popping (len(q) changes as children are added)',
      'Using a list with pop(0) (O(n)) instead of collections.deque',
    ],
    complexity: 'O(n) time, O(w) space (w = widest level)',
    template: `from collections import deque
q = deque([root]) if root else deque()
while q:
    for _ in range(len(q)):          # exactly one level
        node = q.popleft()
        # process node
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)`,
    prereqs: ['tree-dfs'],
    groups: [
      {
        structure: 'Binary Tree',
        note: 'One loop iteration = one level.',
        questions: [
          { title: 'Binary Tree Level Order Traversal', slug: 'binary-tree-level-order-traversal', level: 'Medium', hints: [
            'Freeze len(q) at the start of each level and collect exactly that many values.',
          ] },
          { title: 'Average of Levels in Binary Tree', slug: 'average-of-levels-in-binary-tree', level: 'Easy', hints: [
            'Level order, but sum the level and divide by its size.',
          ] },
          { title: 'Minimum Depth of Binary Tree', slug: 'minimum-depth-of-binary-tree', level: 'Easy', hints: [
            'BFS reaches the shallowest leaf first: return its depth immediately.',
          ] },
          { title: 'Binary Tree Right Side View', slug: 'binary-tree-right-side-view', level: 'Medium', hints: [
            'The visible node on each level is the last one processed in that level.',
          ] },
          { title: 'Binary Tree Zigzag Level Order Traversal', slug: 'binary-tree-zigzag-level-order-traversal', level: 'Medium', hints: [
            'Normal level order; reverse every other level\'s list (or append to the left with a deque).',
          ] },
        ],
      },
    ],
  },

  {
    id: 'heap',
    name: 'Heap / Top-K',
    phase: 2,
    tagline: 'Always know the smallest (or largest) item in O(1), update in O(log n).',
    idea:
      'A heap keeps its minimum at the top; push and pop cost O(log n). To track the k largest items, keep a min-heap of size k and evict the smallest whenever it grows past k. Two heaps (max-heap of the lower half, min-heap of the upper half) give a running median.',
    why:
      'A full sort is O(n log n) and orders everything. A size-k heap only maintains what you need: O(n log k). Its top is the kth largest, because everything smaller has been evicted.',
    cues: [
      '"K largest / smallest / closest / most frequent"',
      '"Kth largest" in a stream',
      'Always process the cheapest / earliest / most urgent next',
      'Merging k sorted things, running median',
    ],
    pitfalls: [
      'Python heapq is a min-heap only: push −x for a max-heap',
      'Using a min-heap of size k for the k smallest (you need a max-heap there)',
      'Comparing non-comparable objects: push (priority, tiebreak, item) tuples',
    ],
    complexity: 'O(n log k) time, O(k) space',
    template: `import heapq
h = []
for x in nums:
    heapq.heappush(h, x)
    if len(h) > k:
        heapq.heappop(h)    # drop the smallest
kth_largest = h[0]`,
    prereqs: ['tree-dfs'],
    groups: [
      {
        structure: 'Array',
        note: 'A size-k heap over the input, or a heap as a "process next" queue.',
        questions: [
          { title: 'Last Stone Weight', slug: 'last-stone-weight', level: 'Easy', hints: [
            'Always take the two heaviest: max-heap (push negatives).',
          ] },
          { title: 'Kth Largest Element in an Array', slug: 'kth-largest-element-in-an-array', level: 'Medium', hints: [
            'Min-heap of size k; the top at the end is the answer.',
            'Follow-up: quickselect gives O(n) average.',
          ] },
          { title: 'K Closest Points to Origin', slug: 'k-closest-points-to-origin', level: 'Medium', hints: [
            'You want the k smallest distances: keep a max-heap of size k (push −distance).',
            'Compare squared distances; no need for sqrt.',
          ] },
          { title: 'Task Scheduler', slug: 'task-scheduler', level: 'Medium', hints: [
            'Greedy: always run the task with the most remaining copies.',
            'Max-heap of counts plus a queue of tasks cooling down (count, time it becomes available).',
            'There is also a counting formula based on the most frequent task — derive it after the simulation works.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Heap of character counts.',
        questions: [
          { title: 'Reorganize String', slug: 'reorganize-string', level: 'Medium', hints: [
            'Place the most frequent remaining character, but never the same as the previous one.',
            'Pop the top two from a max-heap of counts each round; if one count exceeds (n + 1) // 2 it is impossible.',
          ] },
        ],
      },
      {
        structure: 'Linked List',
        note: 'Heap of the current head of each list.',
        questions: [
          { title: 'Merge k Sorted Lists', slug: 'merge-k-sorted-lists', level: 'Hard', hints: [
            'The next output node is the smallest among the k current heads.',
            'Push (value, index, node) for each head; pop, append, push that node\'s next.',
          ] },
        ],
      },
      {
        structure: 'Stream / Design',
        note: 'Data arrives over time; keep only what the answer needs.',
        questions: [
          { title: 'Kth Largest Element in a Stream', slug: 'kth-largest-element-in-a-stream', level: 'Easy', hints: [
            'Keep a min-heap of size k across calls; the top is always the kth largest.',
          ] },
          { title: 'Find Median from Data Stream', slug: 'find-median-from-data-stream', level: 'Hard', hints: [
            'Split numbers into a lower half (max-heap) and an upper half (min-heap).',
            'Keep sizes equal or the lower half one bigger; the median comes from the tops.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'backtracking',
    name: 'Backtracking',
    phase: 2,
    tagline: 'Choose, explore, un-choose — DFS over a tree of decisions.',
    idea:
      'Build a candidate one choice at a time. After each choice, recurse to make the next one; when you return, undo the choice and try the next option. Prune branches that cannot lead to a valid answer.',
    why:
      'Every complete answer is a path in a decision tree, so exploring the tree finds them all. The undo step lets one shared path list be reused, and pruning skips whole subtrees, which is what makes exponential search fast enough for small inputs.',
    cues: [
      '"All combinations / permutations / subsets / partitions"',
      '"Generate all valid…", "can you place / arrange"',
      'Small constraints (n ≤ ~15–20) — the problem expects exponential time',
      'Board or grid search for a word or a placement',
    ],
    pitfalls: [
      'Appending path instead of path[:] (every result ends up as the same list)',
      'Forgetting to undo (pop / unmark) after the recursive call',
      'Duplicates: sort first and skip equal values at the same depth (i > start and a[i] == a[i − 1])',
    ],
    complexity: 'Exponential: roughly (number of answers) × (cost to build one)',
    template: `res = []
def backtrack(start, path):
    res.append(path[:])               # record (subsets record every node)
    for i in range(start, len(nums)):
        path.append(nums[i])          # choose
        backtrack(i + 1, path)        # explore
        path.pop()                    # un-choose
backtrack(0, [])`,
    prereqs: ['recursion'],
    groups: [
      {
        structure: 'Array',
        note: 'Choose elements; the start index decides whether order matters.',
        questions: [
          { title: 'Subsets', slug: 'subsets', level: 'Medium', hints: [
            'Every node of the decision tree is a valid subset, so record at every call.',
            'Loop from start so each element is only considered after the ones before it (no reordering).',
          ] },
          { title: 'Subsets II', slug: 'subsets-ii', level: 'Medium', hints: [
            'Sort first so duplicates are adjacent.',
            'Skip nums[i] when i > start and nums[i] == nums[i − 1]: same choice at the same depth.',
          ] },
          { title: 'Permutations', slug: 'permutations', level: 'Medium', hints: [
            'Order matters, so every unused element is a choice at every depth.',
            'Track used elements (a boolean array); record when the path length equals n.',
          ] },
          { title: 'Combination Sum', slug: 'combination-sum', level: 'Medium', hints: [
            'Elements can be reused: recurse with i, not i + 1.',
            'Prune when the remaining target goes below 0; record when it hits 0.',
          ] },
          { title: 'Combination Sum II', slug: 'combination-sum-ii', level: 'Medium', hints: [
            'Each element used once (recurse with i + 1) and the input has duplicates.',
            'Sort and apply the Subsets II skip rule.',
          ] },
        ],
      },
      {
        structure: 'String',
        note: 'Choose characters or cut points.',
        questions: [
          { title: 'Letter Combinations of a Phone Number', slug: 'letter-combinations-of-a-phone-number', level: 'Medium', hints: [
            'Depth = digit position; choices at each depth = that digit\'s letters.',
          ] },
          { title: 'Generate Parentheses', slug: 'generate-parentheses', level: 'Medium', hints: [
            'At each step you may add "(" if open < n, and ")" if close < open.',
            'Those two rules are the pruning; record when the length is 2n.',
          ] },
          { title: 'Palindrome Partitioning', slug: 'palindrome-partitioning', level: 'Medium', hints: [
            'The choice is where the next cut goes: s[start:end] for every end.',
            'Only recurse when that piece is a palindrome; record when start reaches len(s).',
          ] },
        ],
      },
      {
        structure: 'Grid / Board',
        note: 'Mark a cell as used while exploring from it, unmark on return.',
        questions: [
          { title: 'Word Search', slug: 'word-search', level: 'Medium', hints: [
            'Start DFS from each cell that matches word[0].',
            'Temporarily mark the cell (e.g. "#") so it is not reused, and restore it after exploring.',
          ] },
          { title: 'N-Queens', slug: 'n-queens', level: 'Hard', hints: [
            'Place one queen per row; the choice is the column.',
            'Track used columns, and diagonals by r − c and r + c, for O(1) safety checks.',
          ] },
        ],
      },
    ],
  },
]
