export function enableExerciseReorder(root, onDrop) {
  const nav = document.querySelector('#nav');
  let drag;
  let draggedHandle;

  function cancel() {
    if (!drag) return;
    const { handle, pointerId, card, marker, label, frame } = drag;
    drag = null;
    cancelAnimationFrame(frame);
    card.removeAttribute('data-dragging');
    marker?.removeAttribute('data-drop');
    label?.remove();
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  }

  function showTarget() {
    const { card, others, origin, label, y } = drag;
    const before = others.findIndex(entry => {
      const rect = entry.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    const index = before === -1 ? others.length : before;
    const marker = index === origin ? null : others[before] ?? others.at(-1);
    if (drag.marker !== marker) drag.marker?.removeAttribute('data-drop');
    drag.marker = marker;
    drag.after = before === -1;
    if (marker) marker.dataset.drop = drag.after ? 'after' : 'before';
    const left = card.getBoundingClientRect().left;
    label.style.transform = `translate(${left}px, ${Math.max(8, y - 52)}px)`;
  }

  function tick() {
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    let bottom = top + (viewport?.height ?? window.innerHeight);
    const navRect = nav.getBoundingClientRect();
    if (navRect.top > top && navRect.top < bottom && navRect.bottom >= bottom - 1) bottom = navRect.top;
    const edge = 65;
    const list = drag.card.parentElement.getBoundingClientRect();
    if (drag.y < top + edge && list.top < top + edge) {
      window.scrollBy(0, -Math.min(16, (top + edge - drag.y) / 4));
    } else if (drag.y > bottom - edge && list.bottom > bottom - edge) {
      window.scrollBy(0, Math.min(16, (drag.y - bottom + edge) / 4));
    }
    showTarget();
    drag.frame = requestAnimationFrame(tick);
  }

  root.addEventListener('pointerdown', event => {
    draggedHandle = null;
    const handle = event.target.closest('button.exercise-grip');
    if (!handle || event.button !== 0 || !event.isPrimary || drag) return;
    const card = handle.closest('[data-exercise-id]');
    const cards = [...card.parentElement.children];
    handle.setPointerCapture(event.pointerId);
    drag = { handle, card, pointerId: event.pointerId, startY: event.clientY, y: event.clientY,
      origin: cards.indexOf(card), others: cards.filter(entry => entry !== card) };
  });

  root.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    drag.y = event.clientY;
    if (drag.label || Math.abs(drag.y - drag.startY) < 6) return;
    const label = document.createElement('div');
    label.className = 'exercise-drag-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = drag.card.querySelector('h3').textContent;
    document.body.append(label);
    drag.label = label;
    drag.card.dataset.dragging = '';
    tick();
  });

  root.addEventListener('pointerup', event => {
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.label) {
      drag.y = event.clientY;
      showTarget();
      draggedHandle = drag.handle;
    }
    const { handle, marker, after } = drag;
    cancel();
    if (marker) onDrop(handle, marker.dataset.exerciseId, after);
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, event => {
      if (drag?.pointerId === event.pointerId) cancel();
    });
  }
  root.addEventListener('click', event => {
    if (draggedHandle && event.detail !== 0 && event.target.closest('button.exercise-grip') === draggedHandle) {
      event.stopPropagation();
      draggedHandle = null;
    }
  }, true);
  window.addEventListener('blur', cancel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) {
      draggedHandle = drag.handle;
      cancel();
    }
  });
  return cancel;
}
