# TREE(3): 20 example valid trees (educational subset)

This file gives a **small educational sample** of trees that are valid objects in `TREE(3)`.

- In `TREE(3)`, each node label is from `{0,1,2}`.
- A tree is rooted and finite.
- The full space is unimaginably large; this is only a tiny sample.

## Notation used

I use compact rooted-tree notation:

- `a` means a single-node tree with root label `a`.
- `a(x)` means a root `a` with one child subtree `x`.
- `a(x,y)` means root `a` with two children `x` and `y`.

## First 20 sample trees (simple canonical order)

1. `2`
2. `1`
3. `0`
4. `2(2)`
5. `2(1)`
6. `2(0)`
7. `1(2)`
8. `1(1)`
9. `1(0)`
10. `0(2)`
11. `0(1)`
12. `0(0)`
13. `2(2,2)`
14. `2(2,1)`
15. `2(2,0)`
16. `2(1,1)`
17. `2(1,0)`
18. `2(0,0)`
19. `1(2,2)`
20. `1(2,1)`

## Tiny shape sketches for the first few

- `2`

```text
2
```

- `2(1)`

```text
2
└─1
```

- `2(2,1)`

```text
2
├─2
└─1
```

---

If you want, we can generate another 20 in a stricter ordering rule (for example: by node count, then lexicographic child-label tuples) and draw all of them as ASCII diagrams.
