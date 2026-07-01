function Table(options) {
  this.options = options || {};
  this.rows = [];
}
Table.prototype.push = function(row) {
  this.rows.push(row);
};
Table.prototype.toString = function() {
  return this.rows.map(function(r) { return r.join(' | '); }).join('\n');
};

module.exports = Table;
module.exports.default = Table;
