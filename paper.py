from dataclasses import dataclass
from typing import List
 
isDebug =  False # True #
runAT = True # False #
  
@dataclass
class Card:
    id: int
    pos: int
    layer: int
    side: str  # 'F' (front) или 'R' (reverse)
  
@dataclass
class Operation:
    pos: int
    direction: str  # 'L', 'R', 'R', 'F'
    layer: int      # для совместимости, пока 0
    id: int
  
def parse_ops(ops_str: str):
    return [Operation(int(op[:-1]), op[-1], 0, int(op[:-1])) for op in ops_str.split()]
      
def find_pivot(op: Operation, cards: List[Card]):
    for c in cards:
        if c.pos == op.pos and c.layer == op.layer  and (c.id == op.id or c.id == op.id - 1 ): # : #
            return c
      
      
def print_cards(cards: List[Card]):
    for c in cards:
        print(f"  P{c.id}: pos={c.pos}, layer={c.layer}, side={c.side}")
  
def is_scruffy(op: Operation, cards: List[Card]) -> bool:
    """Проверка 'смятия' — если две карты окажутся в одном слое и позиции."""
    pivot = find_pivot(op, cards)
    if isDebug:
        print("pivot = ", pivot)
    right_side = [c for c in cards if c.id >= pivot.id]
    left_side = [c for c in cards if c.id < pivot.id]
    is_even_layer = (op.layer % 2) == 0
      
    for c in right_side:
        if op.direction == 'R':
            # if (not is_even_layer) and c.pos < pivot.pos and c.layer < pivot.layer:
            #     return True  
            if is_even_layer and c.pos < pivot.pos and c.layer > pivot.layer:
                return True
        else:  # D
            if is_even_layer and c.pos < pivot.pos and c.layer < pivot.layer:
                return True 
    for c in left_side:
        if op.direction == 'R':
            # if (not is_even_layer) and c.pos < pivot.pos and c.layer < pivot.layer:
            #     return True  
            if (not is_even_layer) and c.pos < pivot.pos and c.layer > pivot.layer:
                return True
        else:  # D
            if (not is_even_layer) and c.pos < pivot.pos and c.layer < pivot.layer:
                return True  
         
    return False
  
def apply_op(op: Operation, cards: List[Card], done_idx: int, ops: List[Operation]) -> None:
    """Применение операции сгиба."""
    pivot = find_pivot(op, cards)
     
    is_even_layer = (pivot.layer % 2) == 0
    if isDebug:
        print(f"=== Применяем операцию: {pivot.pos}{op.direction}{op.layer} ===")
      
    if is_even_layer:
        left_side = [c for c in cards if c.id < pivot.id]
        right_side = [c for c in cards if c.id >= pivot.id]
    else:
        left_side = [c for c in cards if c.id <= pivot.id]
        right_side = [c for c in cards if c.id > pivot.id]
         
    min_l = 0
    max_l = 0
    for c in left_side:
        layers = [op['layer'] if isinstance(op, dict) else op.layer 
              for op in left_side if (op['pos'] if isinstance(op, dict) else op.pos) == c.pos]
        min_l = min(layers) 
        max_l = max(layers)
    if isDebug:
        print("Min_l = ", min_l)
        print("Max_l = ", max_l)
         
    layers = [op['layer'] if isinstance(op, dict) else op.layer 
              for op in cards if (op['pos'] if isinstance(op, dict) else op.pos) == pivot.pos]
    min_piv = min(layers)
    max_piv = max(layers)
    if isDebug:
        print("min_piv = ", min_piv)
        print("max_piv = ", max_piv)

    # пересчитываем координаты и слой для правой части
    orig_right = [Card(id=c.id, pos=c.pos, layer=c.layer, side=c.side) for c in right_side]


    for c in right_side:
        layers = [op['layer'] if isinstance(op, dict) else op.layer 
              for op in orig_right if (op['pos'] if isinstance(op, dict) else op.pos) == c.pos]
        min_r = min(layers) 
        max_r = max(layers)
        if isDebug:
            #print(layers)
            #print(orig_right)
            print("Min_r = ", min_r)
            print("Max_r = ", max_r)
        # отражаем позицию относительно линии сгиба
        c.pos = op.pos - (c.pos - op.pos) - 1
  
        # слой зависит от направления: если U — уходит "выше", если D — "ниже"
         
        if is_even_layer:
            if op.direction == 'R':
                c.layer = max(max_l + 1, max_piv + abs(c.layer - max_r) + 1)#max_l + 1#
            else:  # 'F'
                c.layer = min(min_l - 1, op.layer - (c.layer - min_r) - 1)
        else: 
            if op.direction == 'R':
                c.layer = max(max_l + 1, max_piv + abs(c.layer - max_r) + 1)
            else:  # 'F'
                c.layer = min(min_l - 1, min_piv - (c.layer - min_r) - 1)  #op.layer - (c.layer - min_r) - 1 
        c.side = 'R' if c.side == 'F' else 'F'
    #recalculate_ops(done_idx: int, ops: List[Operation], pivot, cards) -> None:
    """Пересчитать будущие операции после поворота."""
    if isDebug:
        print("done_idx =", done_idx)
    pivot = op
    for i in range(done_idx+1, len(ops)):
        op = ops[i]
        if (op.pos > pivot.pos and is_even_layer) or (op.pos < pivot.pos and not is_even_layer):
            op.pos = 2*pivot.pos - op.pos
            if is_even_layer:
                if pivot.direction == 'R':
                    op.layer = max(max_l + 1, op.layer + abs(c.layer - op.layer))
                else:  # 'F'
                    op.layer = min(pivot.layer - (op.layer - min_r) - 1, min_l - 1)
            else:
                if pivot.direction == 'R':
                    op.layer = max(max_l + 1, op.layer + abs(c.layer - op.layer))
                else:  # 'F'
                    op.layer = min(pivot.layer - (op.layer - min_r) - 1, min_l - 1) #pivot.layer - (op.layer - min_r) - 1
            op.direction = 'R' if op.direction == 'F' else 'F'
                  
  
def simulate_folding(n_cards: int, ops: List[Operation]) -> List[Card]:
    """Основная функция симуляции сгибов."""
    # создаем карты
    cards = [Card(id=i, pos=i, layer=0, side='F') for i in range(n_cards+1)]
    if isDebug:
        print("[Начало] Состояние карт:")
        for c in cards:
            print(f"  P{c.id}: pos={c.pos}, layer={c.layer}, side={c.side}")
  
    for idx, op in enumerate(ops):
        if is_scruffy(op, cards):
            if isDebug:
                print(f"  Операция {op.pos}{op.direction} приведет к смятию — отменена!")
            print("SCRUFFY")
            return None
  
        apply_op(op, cards, idx, ops)
        if isDebug:
            print_cards(cards)
       # recalculate_ops(idx, ops, op, cards)
        if isDebug:
            print(ops)
    
    if isDebug: 
        print("\n[Конец] Состояние карт:")
        for c in cards:
            print(f"  P{c.id}: pos={c.pos}, layer={c.layer}, side={c.side}")
  
    return cards
  
def opposite(side: str) -> str:
    return 'F' if side == 'R' else 'R'
      
def calculate_visibility(cards: List[Card]) -> str:
    """
    Вычисляет видимые наружу поверхности после всех сгибов.
    - cards: список Card с полями id,pos,layer,side, где side обозначает, какая сторона "смотрит вверх".
    Возвращает строку вида "P0F P1F ... P0R P1R ..." (в порядке возрастания id группы для каждой буквы).
    """
    # Группировка по позиции
    positions: Dict[int, List[Card]] = {}
    for c in cards:
        positions.setdefault(c.pos, []).append(c)
  
    front_visible: Set[int] = set()
    back_visible: Set[int]  = set()
  
    # Для каждой позиции определяем верхнюю и нижнюю карту
    for pos, stack in positions.items():
        # сортируем по layer (от минимального - "нижний" - к максимальному - "верхний")
        sorted_stack = sorted(stack, key=lambda c: c.layer)
        bottom = sorted_stack[0]
        top    = sorted_stack[-1]
  
        # верхняя карта: наружу смотрит top.side
        if top.side == 'F':
            front_visible.add(top.id)
        else:
            back_visible.add(top.id)
  
        # нижняя карта: наружу смотрит противоположная сторона от bottom.side
        bottom_out = opposite(bottom.side)
        if bottom_out == 'F':
            front_visible.add(bottom.id)
        else:
            back_visible.add(bottom.id)
  
    # Формируем итог: сначала P{id}F по возрастанию id, затем P{id}R
    result_parts: List[str] = []
    for cid in sorted(front_visible):
        result_parts.append(f"P{cid}F")
    for cid in sorted(back_visible):
        result_parts.append(f"P{cid}R")
  
    return " ".join(result_parts)
  
# === Пример использования ===
if __name__ == "__main__":
    n, m, *inp_ops =  "6 4 5F 4R 3F 1F".split() # input().split() #
    n, m = int(n), int(m)
    strO = " ".join(inp_ops)
    if isDebug:
       print("N =",n)
       print("M =",m)
       print("Ops =",strO)
       
    ops = parse_ops(strO)
    if isDebug:
        print(ops)
    cards = simulate_folding(n, ops)
    if not cards == None:
        print(calculate_visibility(cards))
        
    tests = ["3 3 2F 3R 1R",
    "3 3 2F 3R 1F",
    "3 2 2R 1R",
    "4 2 4F 3F",
    "5 5 2F 3R 1F 4R 5R",
    "6 4 5F 4R 3F 1F",
    "7 7 1R 3F 4R 7F 6R 5R 2F",
    "7 7 1F 3F 4R 7F 6R 5R 2F",
    "7 7 7F 5F 4R 1F 2R 3R 6F"
    ]
    expected_results = [
        "P0R P3R",
        "P0F P1F",
        "SCRUFFY",
        "P0F P1F P2F P3F P0R P1R",
        "P4R P5R",
        "P0F P1F P2F P5F",
        "P0R P5R",
        "P1F P5R",
        "P1F P5R" # надо пересчитать
    ]

    if runAT:
        print("\nAutotests\n")
        isDebug = False
        for idx, test in enumerate(tests):
            n, m, *inp_ops =  test.split()
            n, m = int(n), int(m)
            strO = " ".join(inp_ops)
            ops = parse_ops(strO)
            expected = expected_results[idx]
            print("test ", test)
            cards = simulate_folding(n, ops)

            if cards is None:
                result = "SCRUFFY"
            else:
                result = calculate_visibility(cards)

            status = "passed" if result == expected else "failed"
            print(f"result   {result}")
            print(f"expected {expected}")
            print(f"{status}\n")
                
"""
test  3 3 2F 3R 1R
result  P0R P3R 

test  3 3 2F 3R 1F
result  P0F P1F 

test  3 2 2R 1R
SCRUFFY

test  4 2 4F 3F
result  P0F P1F P2F P3F P0R P1R 

test  5 5 2F 3R 1F 4R 5R
result  P4R P5R 

test  6 4 5F 4R 3F 1F
result  P0F P1F P2F P5F 
"""
                
