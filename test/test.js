

describe('collided', function() {
	var objSize = 2;
	var obj1 = {x:0, y:0};

	var objLROverlap = {x:1,  y:1};
	var objLLOverlap = {x:-1, y:1};
	var objULOverlap = {x:-1, y:-1};
	var objUROverlap = {x:1,  y:-1};

	var objRiNoOverlap = {x:2,  y:0};
	var objLoNoOverlap = {x:0, y:2};
	var objLeNoOverlap = {x:-2, y:0};
	var objUpNoOverlap = {x:0,  y:-2};

	it('should return true when objects overlap in the lower right quadrant', function() {
		expect(collided(obj1, objSize, objLROverlap, objSize)).to.be.ok();
	});
	it('should return true when objects overlap in the lower left quadrant', function() {
		expect(collided(obj1, objSize, objLLOverlap, objSize)).to.be.ok();
	});
	it('should return true when objects overlap in the upper left quadrant', function() {
		expect(collided(obj1, objSize, objULOverlap, objSize)).to.be.ok();
	});
	it('should return true when objects overlap in the upper right quadrant', function() {
		expect(collided(obj1, objSize, objUROverlap, objSize)).to.be.ok();
	});

	it('should return false when second object to the right of first', function() {
		expect(collided(obj1, objSize, objRiNoOverlap, objSize)).to.not.be.ok();
	});
	it('should return false when second object below the first', function() {
		expect(collided(obj1, objSize, objLoNoOverlap, objSize)).to.not.be.ok();
	});
	it('should return false when second object to the left of first', function() {
		expect(collided(obj1, objSize, objLeNoOverlap, objSize)).to.not.be.ok();
	});
	it('should return false when second object above the first', function() {
		expect(collided(obj1, objSize, objUpNoOverlap, objSize)).to.not.be.ok();
	});
});

describe('cartesianProduct2', function() {
	var arr1 = ['a', 'b', 'c'];
	var arr2 = [1, 2];

	it('should return cartisian product of two arrays', function() {
		var c = cartesianProduct2(arr1, arr2);
		expect(c).to.have.length(6);
		expect(c[0]).to.eql(['a', 1]);
		expect(c[1]).to.eql(['a', 2]);
		expect(c[2]).to.eql(['b', 1]);
		expect(c[3]).to.eql(['b', 2]);
		expect(c[4]).to.eql(['c', 1]);
		expect(c[5]).to.eql(['c', 2]);
	});
});

describe('detectCollisions', function() {
	var sandbox;
	var objSize = 2;
	var sv1 = new StateVector(100, 1, 1);
	var sv2 = new StateVector(101, 2, 2);
	var sv3 = new StateVector(102, 3, 3);

	beforeEach(function() {
	    sandbox = sinon.sandbox.create();

	    sandbox.stub(window, 'cartesianProduct2', function() {
	    	return [[sv1, sv2], [sv1, sv3], [sv2, sv3]];
	    });

	    sandbox.stub(window, 'collided')
	    	.onFirstCall().returns(true)
	    	.onSecondCall().returns(false)
	    	.onThirdCall().returns(true);
	});

	afterEach(function() {
		sandbox.restore();
	});

	it('should return ids of collided objects', function() {
		var d = detectCollisions([], objSize, [], objSize);
		expect(d).to.have.length(2);
		expect(d[0]).to.eql({id1:100, id2:101});
		expect(d[1]).to.eql({id1:101, id2:102});
	});
});


describe('checkSeekingInvaders', function() {
	it('should return true', function() {
		expect(checkSeekingInvaders(0, 0)).to.be.ok();
	});
});









