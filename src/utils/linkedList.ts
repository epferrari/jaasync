interface LinkedListNode<T> {
  value: T;
  next: LinkedListNode<T>;
}

export class LinkedList<T> {
  private head: LinkedListNode<T> = null;
  private tail: LinkedListNode<T> = null;
  private size: number = 0;

  public push(value: T): number {
    if(!this.head) {
      this.head = this.tail = {
        value,
        next: null
      };
    } else {
      const prevTail = this.tail;
      this.tail = {
        value,
        next: null
      };
      prevTail.next = this.tail;
    }

    this.size++;
    return this.size;
  }

  public shift(): T {
    const {head} = this;
    if(head) {
      this.head = head.next;
      this.size--;
      if(this.size === 0) {
        this.head = null;
        this.tail = null;
      }
      return head.value;
    }
  }

  public get length() {
    return this.size;
  }
}