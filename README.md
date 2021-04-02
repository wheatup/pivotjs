Pivot.js is a super lite-weight library for creating DOM structure with javascript.

## Basic usage

### Register a view

```javascript
P.View('TestView', () => ({
  render() {
    return P('div', { class: 'test-view' }, [
      P('h1', 'Hello World!'), 
      P('ul', [
        P('li', 'hello'), 
        P('li', 'world')
      ])
    ]);
  }
}));
```

### Insert a view into DOM

```javascript
document.body.append(P('TestView').dom);
```

This will create a structure like this and insert it into docment.body:

```html
<div data-pivot="TestView" class="test-view">
  <h1>Hello World!</h1>
  <ul>
    <li>hello</li>
    <li>world</li>
  </ul>
</div>
```

You can get a normal HTMLElement by calling `P('TestView').dom`

### Nesting another view

```javascript
P.View('TestView', () => ({
  render() {
    return (
      P('div', { class: 'test-view' }, [
        P('h1', 'Hello World!'),

        // instead of tag name, specify the view name you registered
        P('NestedView', { candies: 42 }),

        // and you can nest a duplicate that has different properties
        P('NestedView', { candies: 1337 })
      ])
    );
  }
});

P.View('NestedView', () => ({
  render() {
    // get the properties from this.props that passed from above
    return P('span', this.props.candies)
  }
});
```

This will create a structure like this:

```html
<div data-pivot="TestView" class="test-view">
  <h1>Hello World!</h1>
  <span data-pivot="NestedView">42</span>
  <span data-pivot="NestedView">1337</span>
</div>
```

### Handling events

```javascript
P.View('TestView', () => ({

  // you can create a function directly here
  onClickMe() {
    alert('ouch');
  },

  render() {
    return (
      P('div', { class: 'test-view' }, [
        P('h1', { text: 'Hello World!' }),

        // when the span is clicked, it alerts "ouch"
        P('span', 'Click Me!', { '@click': () => this.onClickMe() })
      ])
    );
  }
});
```

### Modifying states

```javascript
P.View('TestView', () => ({
  candies: 0,

  addCandy(number) {
    this.candies += number;
    // rerender so the changes can apply
    t​his.render();
  },

  render() {
    return (
      P('div', { class: 'test-view ' + this.candies ? 'enough' : 'not-enough' }, [
        P('span', 'Candies: ' + this.candies),

        P('button', 'Add 1', { '@click': () => this.addCandy(1) }),
        P('button', 'Add 2', { '@click': () => this.addCandy(2) }]
      ])
    );
  }
});
```
