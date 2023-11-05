// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";



contract Exchange {
	address	public feeAccount;
	uint256 public feePercent;
	//token(user)
	mapping(address => mapping(address => uint256)) public tokens;

	mapping(uint256 => _Order) public orders;
	uint256 public orderCount;


	event Deposit(
		address token,
		address user,
		uint256 amount,
		uint256 balance
	);
	event Withdraw(
		address token,
		address user,
		uint256 amount,
		uint256 balance
	);
	event Order(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		uint256 timestamp
	);

	// A way to moder the Order
	struct _Order{
		// Attributes of an order
		uint256 id; // Unique identifier for the order
		address user; // User who made the order
		address tokenGet; // Address of the token they receive
		uint256 amountGet; // Amount they receive
		address tokenGive; // Address of the token they spend
		uint256 amountGive; // Amount they spend
		uint256 timestamp; // When order was created

	}

	constructor (address _feeAccount, uint256 _feePercent){
		feeAccount = _feeAccount;
		feePercent = _feePercent;
	}

	// Deposit Tokens
	function depositToken(address _token, uint256 _amount) public{


		// Transfer tokens to exchange
		require(Token(_token).transferFrom(msg.sender, address(this), _amount));
			
		// Update user balance
		tokens[_token][msg.sender] = tokens[_token][msg.sender]	+ _amount;

		// Emit an event
		emit Deposit(_token, msg.sender, _amount, balanceOf(_token, msg.sender));
 	}
	// Check Balances
	function balanceOf(address _token, address _user)
	 public
	 view
	 returns (uint256)
	 {
	 	return tokens[_token][_user];
	}

	function withdrawToken(address _token, uint256 _amount)public {
		// Ensure user has enough token to withdraw
		require(tokens[_token][msg.sender] >= _amount);
		// Transfer tokens to user
		Token(_token).transfer(msg.sender,_amount);
		// Update user balance
		tokens[_token][msg.sender] = tokens[_token][msg.sender]	- _amount;
		// Emit event
		emit Withdraw(_token, msg.sender, _amount, balanceOf(_token, msg.sender));
	}

	// Make & Cancel Orders

	function makeOrder(
		address _tokenGet,
		uint256 _amountGet,
		address _tokenGive,
		uint256 _amountGive 
		) public{
		// Prevent orders if tokens aren't on exchange
		require(_amountGive <= tokens[_tokenGive][msg.sender]);
		// Token Give (token they want to spend) - which token , and how much?
		// token Get (token they wad to receive) - which token, and how much?

		// Instanciate new order
		orderCount = orderCount + 1;
		orders[orderCount] = _Order(
			orderCount,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp
			);
		emit Order(orderCount,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp
			);
	}
}
