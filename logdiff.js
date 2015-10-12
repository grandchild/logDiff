
var diff;
var enableContentLocation = false;

function newDiff(element) {
	diff = new LogDiff(element.value);
	diff.show($('div.timediff'));
}


/* Diff class */

function LogDiff(rawdata) {
	this.maxDuration = 0;
	this.lines = [];
	this.ignored = {};
	console.log('parsing ...');
	this.read(rawdata);
	console.log('... done');
};
LogDiff.prototype = {
	read: function(rawdata) {
		var txtLines = rawdata.split('\n');
		for(var i=0; i<txtLines.length; i++) {
			var match = txtLines[i].match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:.\d+)?|\d{13})(.*)/)
			if(match!=null) {
				this.lines.push(
					new Line(
						i,
						moment(match[1], ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss.SSSS', 'x']),
						match[2].trim()
					)
				);
			} else {
				console.log('no match at line', i, ': [', txtLines[i], ']');
				this.lines.push(new Line(i, moment(0), '', /*skip*/true));
			}
		}
		this.calculate();
	},
	calculate: function() {
		this.maxDuration = 0;
		for(var i=0; i<this.lines.length-1; i=next) {
			var next = i+1;
			while(this.lines[next] && this.lines[next].skipped) {
				next += 1;
			}
			if(next>=this.lines.length) {
				this.lines[i].duration = moment.duration(0);
				break;
			}
			var duration = this.duration(this.lines[i], this.lines[next])
			this.lines[i].duration = duration;
			if(this.durVal(duration) > this.maxDuration && !this.lines[i].ignored) {
				this.maxDuration = this.durVal(duration);
			}
		}
		for(var i=0; i<this.lines.length-1; i++) {
			this.lines[i].relative = this.durVal(this.lines[i].duration) / this.maxDuration;
		}
	},
	duration: function(line, next) {
		if(next == undefined) {
			return moment.duration(0);
		}
		return moment.duration(next.time.diff(line.time));
	},
	durVal: function(duration) {
		return duration.asMilliseconds();
	},
	show: function(target) {
		if(target) {
			this.target = target;
		} else if(this.target == undefined) {
			console.error('No target for diff specified. Call LogDiff.show() with target param.');
			return;
		}
		this.target.empty();
		$('#contentBar').empty();
		var viewportHeight = $(window).height();
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i];
			this.target.append(
				$('.prototypes > .line.diff')
					.clone()
					.attr('id', line.id)
					.toggleClass('ignored', line.ignored)
					.toggleClass('skipped', line.skipped)
					.mouseenter(showTooltip)
					.mouseleave(hideTooltip)
					.append(
						$(line.toString())
					)
				);
			$('#contentBar').
				append(
					$('<div>')
						.css({
							width: '8px',
							height: (viewportHeight - 20)/this.lines.length + 'px',
							'background-color': line.timeColor()
						})
				);
		};
		if($(this.target).height() > viewportHeight) {
			enableContentLocation = true;
			$('#contentLocation')
				.show()
				.css({
					height: ( parseFloat(viewportHeight) / $(this.target).height() * 100.0) + '%'
				});
		} else {
			// console.log('hide location', $(this.target));
			enableContentLocation = false;
			$('#contentLocation').hide();
		}
	},
	update: function() {
		this.calculate();
		this.show();
	},
	toggleIgnore: function(id) {
		if(id in this.ignored) {
			this.unignore(id);
		} else {
			this.ignore(id);
		}
	},
	ignore: function(id) {
		this.ignored[id] = true;
		this.lines[id].ignored = true;
		this.update();
	},
	unignore: function(id) {
		delete this.ignored[id];
		this.lines[id].ignored = false;
		this.update();
	}
}


/* Line class */

function Line(id, time, data, skipped) {
	this.id = id;
	this.time = time;
	this.data = data;
	this.duration = moment.duration(0);
	this.relative = 0;
	this.ignored = false;
	this.skipped = skipped===true;
}
Line.prototype.toString = function() {
	if(this.skipped) {
		return '<span></span>';
	}
	var suffixes = ['y ', 'm ', 'd ', 'h ', 'm ', 's ', 'ms '];
	var paddings = [4, 2, 2, 2, 2, 2, 3];
	
	var vals = this.duration.toISOString().match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:.(\d+))?S)?)?/);
	vals[7] = parseInt(parseFloat('0.'+vals[7])*1000);
	
	var str = '';
	for (var i = 0; i < vals.length-1; i++) {
		if(vals[i+1]) {
			var pad = Array(paddings[i]+1).join('0');
			str += pad.substring(0, pad.length-vals[i+1].length)+vals[i+1]+suffixes[i];
		}
	};
	
	return '<span class="line time" style="color: '+this.timeColor()+';">'+
				str+
			'</span>'+
			'<span class="line data" style="color: hsla(0, 0%, 100%, '+(this.relative*.75+0.25)+');">'+
				this.data+
			'</span>'+
			'<br/>';
};
Line.prototype.timeColor = function(noAlpha) {
	var timeSaturation = 100;
	var timeAlpha = 1;
	if(this.duration.asMilliseconds()==0 || this.ignored) {
		relative = 0;
		timeSaturation = 0;
		timeAlpha = 0.5;
	}
	if(noAlpha) {
		return 'hsl('+parseInt((1.0-this.relative)*115)+', '+timeSaturation+'%, 50%)'
	} else {
		return 'hsla('+parseInt((1.0-this.relative)*115)+', '+timeSaturation+'%, 50%, '+timeAlpha+')'
	}
}


/* Events */

function showTooltip(event) {
	var elem = event.target;
	updateTooltip(elem);
}
function updateTooltip(elem) {
	var rect = elem.getBoundingClientRect();
	var $tt = $('.tooltip')
		.text(elem.classList.contains('ignored') ? 'Unignore' : 'Ignore')
		.show();
	var ttrect = $('.tooltip')[0].getBoundingClientRect();
	$tt.css({
		left: rect.left - ttrect.width - 10 + window.scrollX,
		top: rect.top + rect.height/2 - ttrect.height/2 + window.scrollY
	});
}
function hideTooltip() {
	$('.tooltip').hide();
}

document.onscroll = function() {
	var rect = $('div.timediff')[0].getBoundingClientRect();
	$('#contentLocation').css({
		top: ( parseFloat(-rect.top) / rect.height ) * ( $(window).height() )
	});
}