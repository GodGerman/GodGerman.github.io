export class TreeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = null;
        this.ctx = null;
        this.onNodeClick = null;

        // Layout constants
        this.NODE_W = 160;
        this.NODE_H = 70;
        this.LEVEL_GAP = 180;
        this.NODE_SPACING = 60;
        this.COUPLE_GAP = 30;
        this.LINE_COLOR = '#ffffff';
        this.LINE_WIDTH = 1.8;

        // Pan / Zoom state
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this._dragging = false;
        this._lastMouse = { x: 0, y: 0 };

        // Rendering data
        this._positions = new Map();
        this._members = [];
        this._hoveredNode = null;
        this._couples = [];
        this._childrenOfCouple = new Map();
        this._childrenOfSingle = new Map();
        this._byId = new Map();

        this._initCanvas();
    }

    /* ──────────── Canvas bootstrap ──────────── */
    _initCanvas() {
        this.container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Mouse
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this._onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
        this.canvas.addEventListener('click', (e) => this._onClick(e));

        // Touch
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e));
    }

    _resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._canvasW = rect.width;
        this._canvasH = rect.height;
        this._draw();
    }

    /* ──────────── Interaction helpers ──────────── */
    _screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.scale,
            y: (sy - this.panY) / this.scale
        };
    }

    _onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.15, Math.min(3, this.scale * delta));
        this.panX = mx - (mx - this.panX) * (newScale / this.scale);
        this.panY = my - (my - this.panY) * (newScale / this.scale);
        this.scale = newScale;
        this._draw();
    }

    _onMouseDown(e) {
        this._dragging = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    _onMouseMove(e) {
        if (this._dragging) {
            this.panX += e.clientX - this._lastMouse.x;
            this.panY += e.clientY - this._lastMouse.y;
            this._lastMouse = { x: e.clientX, y: e.clientY };
            this._draw();
        } else {
            const rect = this.canvas.getBoundingClientRect();
            const w = this._screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            let found = null;
            for (const [id, pos] of this._positions) {
                const hw = this.NODE_W / 2, hh = this.NODE_H / 2;
                if (w.x >= pos.x - hw && w.x <= pos.x + hw && w.y >= pos.y - hh && w.y <= pos.y + hh) {
                    found = id;
                    break;
                }
            }
            if (found !== this._hoveredNode) {
                this._hoveredNode = found;
                this.canvas.style.cursor = found ? 'pointer' : 'grab';
                this._draw();
            }
        }
    }

    _onMouseUp() {
        this._dragging = false;
        this.canvas.style.cursor = this._hoveredNode ? 'pointer' : 'grab';
    }

    _onTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            this._dragging = true;
            this._lastMouse = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            e.preventDefault();
            this._dragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this._initialPinchDistance = Math.hypot(dx, dy);
            this._initialScale = this.scale;
            
            const rect = this.canvas.getBoundingClientRect();
            this._pinchCenter = {
                x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
                y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
            };
        }
    }

    _onTouchMove(e) {
        if (this._dragging && e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            this.panX += t.clientX - this._lastMouse.x;
            this.panY += t.clientY - this._lastMouse.y;
            this._lastMouse = { x: t.clientX, y: t.clientY };
            this._draw();
        } else if (e.touches.length === 2 && this._initialPinchDistance) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);
            
            const newScale = Math.max(0.15, Math.min(3, this._initialScale * (currentDistance / this._initialPinchDistance)));
            
            this.panX = this._pinchCenter.x - (this._pinchCenter.x - this.panX) * (newScale / this.scale);
            this.panY = this._pinchCenter.y - (this._pinchCenter.y - this.panY) * (newScale / this.scale);
            this.scale = newScale;
            this._draw();
        }
    }
    
    _onTouchEnd(e) {
        this._onMouseUp();
        this._initialPinchDistance = null;
        if (e.touches.length === 1) {
            const t = e.touches[0];
            this._dragging = true;
            this._lastMouse = { x: t.clientX, y: t.clientY };
        }
    }

    _onClick(e) {
        if (!this.onNodeClick) return;
        const rect = this.canvas.getBoundingClientRect();
        const w = this._screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        for (const [id, pos] of this._positions) {
            const hw = this.NODE_W / 2, hh = this.NODE_H / 2;
            if (w.x >= pos.x - hw && w.x <= pos.x + hw && w.y >= pos.y - hh && w.y <= pos.y + hh) {
                const member = this._members.find(m => m.id === id);
                if (member) this.onNodeClick(member);
                return;
            }
        }
    }

    /* ──────────── Age helper ──────────── */
    calcularEdad(fechaNacimiento, fallecido, fechaFallecimiento) {
        if (!fechaNacimiento) return '?';
        const numNac = new Date(fechaNacimiento);
        numNac.setMinutes(numNac.getMinutes() + numNac.getTimezoneOffset());
        const end = fallecido && fechaFallecimiento ? new Date(fechaFallecimiento) : new Date();
        if (fallecido && fechaFallecimiento) end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        let age = end.getFullYear() - numNac.getFullYear();
        const m = end.getMonth() - numNac.getMonth();
        if (m < 0 || (m === 0 && end.getDate() < numNac.getDate())) age--;
        return isNaN(age) ? '?' : age;
    }

    /* ══════════════════════════════════════════
       RENDER – recursive tree layout
       ══════════════════════════════════════════ */
    render(members) {
        this._members = members;
        this._positions.clear();

        if (members.length === 0) { this._draw(); return; }

        const HGAP = 25;

        // ── 1. Lookups ──
        const byId = new Map();
        members.forEach(m => byId.set(m.id, m));
        this._byId = byId;

        // ── 2. Compute generation levels ──
        const levels = new Map();
        members.forEach(m => {
            if (!m.idPadre && !m.idMadre) levels.set(m.id, 0);
        });
        let changed = true, iter = 0;
        while (changed && iter < 100) {
            changed = false; iter++;
            members.forEach(m => {
                if (levels.has(m.id)) return;
                const pL = m.idPadre && levels.has(m.idPadre) ? levels.get(m.idPadre) : -1;
                const mL = m.idMadre && levels.has(m.idMadre) ? levels.get(m.idMadre) : -1;
                const maxP = Math.max(pL, mL);
                if (maxP >= 0) { levels.set(m.id, maxP + 1); changed = true; }
                else if (m.idPareja && levels.has(m.idPareja)) { levels.set(m.id, levels.get(m.idPareja)); changed = true; }
            });
        }
        members.forEach(m => { if (!levels.has(m.id)) levels.set(m.id, 0); });
        members.forEach(m => {
            if (m.idPareja) {
                const forced = Math.max(levels.get(m.id) || 0, levels.get(m.idPareja) || 0);
                levels.set(m.id, forced);
                levels.set(m.idPareja, forced);
            }
        });

        // ── 3. Identify couples ──
        const coupleSet = new Set();
        const couples = [];
        members.forEach(m => {
            if (m.idPareja) {
                const key = [m.id, m.idPareja].sort().join('-');
                if (!coupleSet.has(key)) {
                    coupleSet.add(key);
                    couples.push({ p1: m.id, p2: m.idPareja });
                }
            }
        });

        // ── 4. Map children to parent pairs / singles ──
        const childrenOfCouple = new Map();
        const childrenOfSingle = new Map();
        members.forEach(m => {
            if (m.idPadre && m.idMadre) {
                const key = [m.idPadre, m.idMadre].sort().join('-');
                if (!childrenOfCouple.has(key)) childrenOfCouple.set(key, []);
                childrenOfCouple.get(key).push(m.id);
            } else if (m.idPadre) {
                if (!childrenOfSingle.has(m.idPadre)) childrenOfSingle.set(m.idPadre, []);
                childrenOfSingle.get(m.idPadre).push(m.id);
            } else if (m.idMadre) {
                if (!childrenOfSingle.has(m.idMadre)) childrenOfSingle.set(m.idMadre, []);
                childrenOfSingle.get(m.idMadre).push(m.id);
            }
        });

        // ── 5. Get children in spatial order: personOnly → couple → spouseOnly ──
        const getChildren = (personId) => {
            const m = byId.get(personId);
            const personOnlyKids = [...(childrenOfSingle.get(personId) || [])];
            let coupleKids = [];
            let spouseOnlyKids = [];
            if (m && m.idPareja) {
                const key = [personId, m.idPareja].sort().join('-');
                coupleKids = [...(childrenOfCouple.get(key) || [])];
                spouseOnlyKids = [...(childrenOfSingle.get(m.idPareja) || [])];
            }
            // Order: person's solo kids (LEFT) → couple kids (CENTER) → spouse's solo kids (RIGHT)
            return [...new Set([...personOnlyKids, ...coupleKids, ...spouseOnlyKids])];
        };

        // ── 6. Build family units as a tree ──
        const builtUnits = new Set();

        const buildUnit = (personId) => {
            if (builtUnits.has(personId)) return null;
            builtUnits.add(personId);

            const m = byId.get(personId);
            if (!m) return null;

            const unit = { person: personId, spouse: null, children: [] };

            if (m.idPareja && byId.has(m.idPareja)) {
                unit.spouse = m.idPareja;
                builtUnits.add(m.idPareja);
            }

            const kids = getChildren(personId);
            kids.forEach(kidId => {
                const childUnit = buildUnit(kidId);
                if (childUnit) unit.children.push(childUnit);
            });

            return unit;
        };

        const roots = [];
        const level0 = members.filter(m => (levels.get(m.id) || 0) === 0);
        level0.forEach(m => {
            if (!builtUnits.has(m.id)) {
                const unit = buildUnit(m.id);
                if (unit) roots.push(unit);
            }
        });

        // ── 7. Recursive width calculation ──
        const NW = this.NODE_W;
        const CG = this.COUPLE_GAP;

        const unitHeadWidth = (unit) => {
            return unit.spouse ? NW * 2 + CG : NW;
        };

        const unitWidth = (unit) => {
            if (unit.children.length === 0) return unitHeadWidth(unit);
            let childrenTotalW = 0;
            unit.children.forEach((child, i) => {
                childrenTotalW += unitWidth(child);
                if (i < unit.children.length - 1) childrenTotalW += HGAP;
            });
            return Math.max(unitHeadWidth(unit), childrenTotalW);
        };

        // ── 8. Recursive placement ──
        const placeUnit = (unit, centerX, y) => {
            if (unit.spouse) {
                const offset = (NW + CG) / 2;
                this._positions.set(unit.person, { x: centerX - offset, y });
                this._positions.set(unit.spouse, { x: centerX + offset, y });
            } else {
                this._positions.set(unit.person, { x: centerX, y });
            }

            if (unit.children.length > 0) {
                const childY = y + this.LEVEL_GAP;
                let childrenTotalW = 0;
                unit.children.forEach((child, i) => {
                    childrenTotalW += unitWidth(child);
                    if (i < unit.children.length - 1) childrenTotalW += HGAP;
                });
                let startX = centerX - childrenTotalW / 2;
                unit.children.forEach(child => {
                    const cw = unitWidth(child);
                    placeUnit(child, startX + cw / 2, childY);
                    startX += cw + HGAP;
                });
            }
        };

        // ── 9. Place all roots ──
        let totalRootWidth = 0;
        roots.forEach((r, i) => {
            totalRootWidth += unitWidth(r);
            if (i < roots.length - 1) totalRootWidth += HGAP;
        });
        let rx = -totalRootWidth / 2;
        roots.forEach(root => {
            const rw = unitWidth(root);
            placeUnit(root, rx + rw / 2, 0);
            rx += rw + HGAP;
        });

        // ── 10. Store connection data ──
        this._couples = couples;
        this._childrenOfCouple = childrenOfCouple;
        this._childrenOfSingle = childrenOfSingle;

        // ── 11. Auto-center view ──
        let allX = [], allY = [];
        for (const pos of this._positions.values()) {
            allX.push(pos.x);
            allY.push(pos.y);
        }
        if (allX.length > 0) {
            const midX = (Math.min(...allX) + Math.max(...allX)) / 2;
            const midY = (Math.min(...allY) + Math.max(...allY)) / 2;
            const rangeX = Math.max(...allX) - Math.min(...allX) + this.NODE_W * 2;
            const rangeY = Math.max(...allY) - Math.min(...allY) + this.NODE_H * 2;
            const fitScaleX = this._canvasW / rangeX;
            const fitScaleY = this._canvasH / rangeY;
            this.scale = Math.min(fitScaleX, fitScaleY, 1) * 0.85;
            this.panX = this._canvasW / 2 - midX * this.scale;
            this.panY = this._canvasH / 2 - midY * this.scale;
        }

        this._draw();
    }

    /* ══════════════════════════════════════════
       DRAW – renders the full frame
       ══════════════════════════════════════════ */
    _draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, this._canvasW, this._canvasH);
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        // Connections first (behind nodes)
        this._drawConnections(ctx);

        // Then nodes
        this._members.forEach(m => {
            const pos = this._positions.get(m.id);
            if (!pos) return;
            this._drawNode(ctx, m, pos.x, pos.y, m.id === this._hoveredNode);
        });

        ctx.restore();
    }

    /* ──────────── Draw orthogonal connections ──────────── */
    _drawConnections(ctx) {
        ctx.strokeStyle = this.LINE_COLOR;
        ctx.lineWidth = this.LINE_WIDTH;
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'square';

        // Helper: which parents does a couple have single-parent children for?
        const coupleHasSingleKids = new Set();
        this._couples.forEach(c => {
            if (this._childrenOfSingle.has(c.p1)) coupleHasSingleKids.add(c.p1);
            if (this._childrenOfSingle.has(c.p2)) coupleHasSingleKids.add(c.p2);
        });

        // 1. Couple horizontal lines
        this._couples.forEach(c => {
            const p1 = this._positions.get(c.p1);
            const p2 = this._positions.get(c.p2);
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });

        // 2. Couple -> children: bus at 55% between parent and child
        this._childrenOfCouple.forEach((kids, key) => {
            const [id1, id2] = key.split('-');
            const p1 = this._positions.get(id1);
            const p2 = this._positions.get(id2);
            if (!p1 || !p2) return;

            const midX = (p1.x + p2.x) / 2;
            const parentY = Math.max(p1.y, p2.y);

            const childPositions = kids.map(cid => this._positions.get(cid)).filter(Boolean);
            if (childPositions.length === 0) return;

            const childY = childPositions[0].y;
            // Use 55% when single-parent kids also exist, else 50%
            const hasSingleSiblings = coupleHasSingleKids.has(id1) || coupleHasSingleKids.has(id2);
            const busFraction = hasSingleSiblings ? 0.55 : 0.5;
            const busY = parentY + (childY - parentY) * busFraction;

            ctx.beginPath();
            ctx.moveTo(midX, parentY);
            ctx.lineTo(midX, busY);

            if (childPositions.length === 1) {
                const cPos = childPositions[0];
                ctx.lineTo(cPos.x, busY);
                ctx.lineTo(cPos.x, cPos.y);
            } else {
                const xs = childPositions.map(p => p.x);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);

                ctx.moveTo(minX, busY);
                ctx.lineTo(maxX, busY);

                childPositions.forEach(cPos => {
                    ctx.moveTo(cPos.x, busY);
                    ctx.lineTo(cPos.x, cPos.y);
                });
            }
            ctx.stroke();
        });

        // 3. Single parent -> children: bus at 30% (higher than couple bus)
        this._childrenOfSingle.forEach((kids, parentId) => {
            const pPos = this._positions.get(parentId);
            if (!pPos) return;

            const parentY = pPos.y;
            const childPositions = kids.map(cid => this._positions.get(cid)).filter(Boolean);
            if (childPositions.length === 0) return;

            const childY = childPositions[0].y;

            // Check if this parent is part of a couple (and thus needs offset bus Y)
            const parentMember = this._byId.get(parentId);
            const isInCouple = parentMember && parentMember.idPareja;
            const busFraction = isInCouple ? 0.30 : 0.5;
            const busY = parentY + (childY - parentY) * busFraction;

            // Calculate center of the children group
            const xs = childPositions.map(p => p.x);
            const groupCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;

            ctx.beginPath();

            // Vertical from parent down to bus level
            ctx.moveTo(pPos.x, parentY);
            ctx.lineTo(pPos.x, busY);

            // Horizontal from parent X to group center at bus level
            if (Math.abs(pPos.x - groupCenterX) > 1) {
                ctx.lineTo(groupCenterX, busY);
            }

            if (childPositions.length === 1) {
                const cPos = childPositions[0];
                // If parent X != child X, draw horizontal then vertical
                ctx.moveTo(pPos.x, busY);
                ctx.lineTo(cPos.x, busY);
                ctx.lineTo(cPos.x, cPos.y);
            } else {
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);

                ctx.moveTo(minX, busY);
                ctx.lineTo(maxX, busY);

                childPositions.forEach(cPos => {
                    ctx.moveTo(cPos.x, busY);
                    ctx.lineTo(cPos.x, cPos.y);
                });
            }
            ctx.stroke();
        });
    }

    /* ──────────── Draw a single node ──────────── */
    _drawNode(ctx, member, x, y, isHovered) {
        const w = this.NODE_W;
        const h = this.NODE_H;
        const rx = w / 2;
        const ry = h / 2;

        const baseColor = isHovered ? '#2563eb' : '#1e40af';
        const borderColor = member.fallecido ? '#94a3b8' : '#3b82f6';

        // Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 5;

        // Ellipse background
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.restore();

        // Ellipse border
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        // Text
        const edad = this.calcularEdad(member.fechaNacimiento, member.fallecido, member.fechaFallecimiento);
        const iconSexo = member.sexo === 'M' ? '♂ Masculino' : (member.sexo === 'F' ? '♀ Femenino' : '⚥ Otro');

        // Name (bold, white)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = `${member.nombre} ${member.apellido}`;
        let displayName = name;
        if (ctx.measureText(name).width > w - 20) {
            while (ctx.measureText(displayName + '…').width > w - 20 && displayName.length > 3) {
                displayName = displayName.slice(0, -1);
            }
            displayName += '…';
        }
        ctx.fillText(displayName, x, y - 14);

        // Sex (italic, lighter)
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'italic 11px Inter, Arial, sans-serif';
        ctx.fillText(iconSexo, x, y + 4);

        // Age or Fallecido
        if (member.fallecido) {
            const txtFallecido = member.sexo === 'F' ? '✝ Fallecida' : '✝ Fallecido';
            ctx.fillStyle = '#fca5a5';
            ctx.font = '11px Inter, Arial, sans-serif';
            ctx.fillText(txtFallecido, x, y + 20);
        } else if (edad !== '?') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px Inter, Arial, sans-serif';
            ctx.fillText(`${edad} Años`, x, y + 20);
        }
    }
}