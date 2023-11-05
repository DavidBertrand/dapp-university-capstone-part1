const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
	return value = ethers.utils.parseUnits(n.toString(), 'ether')
}
describe('Exchange', () => {
	let deployer, feeAccount, exchange

	const feePercent = 10

	beforeEach( async () => {
		const  Exchange = await ethers.getContractFactory('Exchange')
		const  Token = await ethers.getContractFactory('Token')
		
		token1 = await Token.deploy('Dapp University', 'DAPP', '1000000')
		token2 = await Token.deploy('Mock Dai University', 'mDAI', '1000000')


		// Fetch Token from Blockchain
		accounts = await ethers.getSigners()
		deployer = accounts[0]
		feeAccount = accounts[1]
		user1 = accounts[2]
		user2 = accounts[3]

		let transaction = await token1.connect(deployer).transfer(user1.address, tokens(100))
		await transaction.wait()
		exchange = await Exchange.deploy(feeAccount.address, feePercent) 


	})

	describe ('Deployment', () => {
		it( 'tracks the fee account ', async() => {
			expect (await exchange.feeAccount()).to.equal(feeAccount.address)
		})
		it( 'tracks the fee percent ', async() => {
			expect (await exchange.feePercent()).to.equal(feePercent)
		})
	})

	describe('Depositing Tokens', () => {
		let transaction, result
		let amount = tokens(10)
	

		describe('Success', () => {

			beforeEach( async () => {
				// Approbe Token
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = transaction.wait()
				// Deposit Token
				transaction = await exchange.connect(user1).depositToken(token1.address, amount)
				result = await transaction.wait()
			})
			it('tracks the token deposit', async () =>{
				expect( await token1.balanceOf(exchange.address)).to.equal(amount)
				expect( await exchange.tokens(token1.address, user1.address)).to.equal(amount)
				expect( await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)

			})

			it('emits an Deposit event', async() => {
				const event = result.events[1]  // 2 events were emitted
				expect(event.event).to.equal('Deposit')
				
				const args = event.args
				expect (args.token).to.equal(token1.address)
				expect (args.user).to.equal(user1.address)
				expect (args.amount).to.equal(amount)
				expect (args.balance).to.equal(amount)
			})

		})

		describe('Failure', () => {
			it('fails when no tokens are approved', async () =>{
				await expect(exchange.connect(user1).depositToken(token1.address, amount)).to.be.reverted

			})
		})
	})

	describe('Withdrawing Tokens', () => {
		let transaction, result
		let amount = tokens(10)
	

		describe('Success', () => {

			beforeEach( async () => {
				// Approbe Token
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = transaction.wait()
				// Deposit Token before Withdrawing Token
				transaction = await exchange.connect(user1).depositToken(token1.address, amount)
				result = await transaction.wait()


				// Now Withdraw Token
				transaction = await exchange.connect(user1).withdrawToken(token1.address, amount)
				result = await transaction.wait()

			})
			it('withdraw token funds', async () =>{
				expect( await token1.balanceOf(exchange.address)).to.equal(0)
				expect( await exchange.tokens(token1.address, user1.address)).to.equal(0)
				expect( await exchange.balanceOf(token1.address, user1.address)).to.equal(0)

			})


			it('emits an Withdraw event', async() => {
				const event = result.events[1]  // 2 events were emitted
				expect(event.event).to.equal('Withdraw')
				
				const args = event.args
				expect (args.token).to.equal(token1.address)
				expect (args.user).to.equal(user1.address)
				expect (args.amount).to.equal(amount)
				expect (args.balance).to.equal(0)
			})


		})

		describe('Failure', () => {
			it('fails for insufficient balance', async () =>{
				// Attempts to withdraw token on a 0 balance
				await expect(exchange.connect(user1).withdrawToken(token1.address, amount)).to.be.reverted

			})
		})

	})

	describe('Checking Balances', () => {

		describe('Withdrawing Tokens', () => {
			let transaction, result
			let amount = tokens(1)	

			beforeEach( async () => {
				// Approbe Token
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = transaction.wait()
				// Deposit Token before Withdrawing Token
				transaction = await exchange.connect(user1).depositToken(token1.address, amount)
				result = await transaction.wait()

			})
			it('returns user balance', async () =>{
				expect( await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
			})

		})

	})


	describe('Making Orders', () => {
		let transaction, result
		let amount = tokens(1)	

		describe('Success', () => {

			beforeEach( async () => {
				// Deposit token before making an order
				// Approbe Token
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = transaction.wait()
				// Deposit Token before Withdrawing Token
				transaction = await exchange.connect(user1).depositToken(token1.address, amount)
				result = await transaction.wait()

				// Make order

				transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount) 
				result = await transaction.wait()
			})

			it('tracks the newly created order', async () =>{
				// Attempts to withdraw token on a 0 balance
				expect( await exchange.orderCount()).to.equal(1)
			})

			it('emits an Order event', async() => {
				const event = result.events[0]  // 1 event were emitted
				expect(event.event).to.equal('Order')
				
				const args = event.args
				expect (args.id).to.equal(1)
				expect (args.user).to.equal(user1.address)
				expect (args.tokenGet).to.equal(token2.address)				
				expect (args.amountGet).to.equal(amount)
				expect (args.tokenGive).to.equal(token1.address)				
				expect (args.amountGive).to.equal(amount)				
				expect (args.timestamp).to.at.least(1)
			})
		})

			describe('Failure', () => {
				it('reject order with insufficient balance', async () =>{
					await expect( exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)).to.be.reverted

				})
		})

	})


	describe('Order actions', () => {
		let transaction, result
		let amount = tokens(1)

		beforeEach( async () => {
			// Deposit token before making an order
			// Approbe Token
			transaction = await token1.connect(user1).approve(exchange.address, amount)
			result = transaction.wait()
			// Deposit Token before Withdrawing Token
			transaction = await exchange.connect(user1).depositToken(token1.address, amount)
			result = await transaction.wait()

			// Make order
			transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount) 
			result = await transaction.wait()

		})


		describe('Cancelling orders', async ()=> {


			
			describe('Success', async () => {
				beforeEach(async() => {
					// Cancel order
					transaction = await exchange.connect(user1).cancelOrder(1) 
					result = await transaction.wait()
				})

				it('updates canceled orders', async () => {
					expect(await exchange.orderCancelled(1)).to.equal(true)
					expect(await exchange.orderCount()).to.equal(0)
				})

				it('emits a Cancel event', async() => {
					const event = result.events[0]  // 1 event were emitted
					expect(event.event).to.equal('Cancel')
					
					const args = event.args
					expect (args.id).to.equal(1)
					expect (args.user).to.equal(user1.address)
					expect (args.tokenGet).to.equal(token2.address)				
					expect (args.amountGet).to.equal(amount)
					expect (args.tokenGive).to.equal(token1.address)				
					expect (args.amountGive).to.equal(amount)				
					expect (args.timestamp).to.at.least(1)
				})
			})

			describe('Failure', async () => {
				beforeEach(async() => {
					// Cancel order
					//transaction = await exchange.connect(user1).cancelOrder(1) 
					//result = await transaction.wait()
				})

				it('Rejects invalid order ids', async () => {
					const invalidOrder = 999
					await expect(exchange.connect(user1).cancelOrder(invalidOrder)).to.reverted 
					//expect(await exchange.orderCount()).to.equal(0)
				})
				it('Rejects unauthorized cancelation', async () => {
					const invalidOrder = 999
					await expect(exchange.connect(user2).cancelOrder(1)).to.reverted 
					//expect(await exchange.orderCount()).to.equal(0)
				})				
			})
		
			

		})

	})

})
