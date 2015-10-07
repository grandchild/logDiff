
var diff;

function newDiff(element) {
	// $()
	diff = new LogDiff(element.value);
	diff.show($('div.timediff'));
}


function LogDiff(rawdata) {
	this.maxDuration = 0;
	this.lines = [];
	console.log('parsing ...');
	this.read(rawdata);
	console.log('... done');
};
LogDiff.prototype = {
	read: function(rawdata) {
		var txtLines = rawdata.split('\n');
		for(var i=0; i<txtLines.length; i++) {
			var match = txtLines[i].match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:.\d+)?|\d{13})(.*)/)
			if(match==null) {
				console.log("no match at line", i, ": [", txtLines[i], "]");
				continue;
			}
			this.lines.push(
				new Line(
					moment(match[1], ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss.SSSS', 'x']),
					match[2].trim()
				)
			);
		}
		this.maxDuration = 0;
		for(var i=0; i<this.lines.length-1; i++) {
			var duration = this.duration(this.lines[i], this.lines[i+1])
			this.lines[i].duration = duration;
			if(this.durVal(duration) > this.maxDuration) {
				this.maxDuration = this.durVal(duration);
			}
		}
		for(var i=0; i<this.lines.length-1; i++) {
			this.lines[i].relative = this.durVal(this.lines[i].duration) / this.maxDuration;
		}
	},
	duration: function(line, next) {
		// return moment.range(line.time, next.time);
		return moment.duration(next.time.diff(line.time));
	},
	durVal: function(duration) {
		// duration.valueOf();
		return duration.asMilliseconds();
	},
	show: function(target) {
		target.empty();
		for (var i = 0; i < this.lines.length; i++) {
			target.append($(this.lines[i].toString()));
		};
	}
}


function Line(time, data) {
	this.time = time;
	this.data = data;
	this.duration = moment.duration(0);
	this.relative = 0;
}
Line.prototype.toString = function() {
	var suffixes = ['y ', 'm ', 'd ', 'h ', 'm ', 's ', 'ms '];
	var paddings = [4, 2, 2, 2, 2, 2, 3];
	
	var vals = this.duration.toISOString().match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:.(\d+))?S)?)?/);
	vals[7] = parseInt(parseFloat("0."+vals[7])*1000);
	
	var str = '';
	for (var i = 0; i < vals.length-1; i++) {
		if(vals[i+1]) {
			var pad = Array(paddings[i]+1).join('0');
			str += pad.substring(0, pad.length-vals[i+1].length)+vals[i+1]+suffixes[i];
		}
	};
	
	return (this.duration.asMilliseconds()==0 ?
				'<span class="line time" style="color: hsla(0, 0%, 100%, 0.25);">'+
					'00s '
			:
				'<span class="line time" style="color: hsl('+parseInt((1.0-this.relative)*115)+', 100%, 50%);">'+
					str
			)+
			'</span>'+
			'<span class="line data" style="color: hsla(0, 0%, 100%, '+(this.relative*.75+0.25)+');">'+
				this.data+
			'</span>'+
			'<br/>';
};
