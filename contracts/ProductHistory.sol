// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/// @title ProductHistory - Smart contract for supply chain tracking
/// @notice Records lifecycle events for products identified by QR code
contract ProductHistory {

    enum EventType { PRODUCED, TRANSPORTED, STORED, DONATED, SOLD }

    struct ProductEvent {
        EventType eventType;
        string    location;
        string    actor;
        string    notes;
        uint256   timestamp;  
        uint256   eventDate;  
    }

    struct ProductInfo {
        string  name;
        string  originLocation;
        string  producerName;
        bool    exists;
        uint256 registeredAt;
    }

    address public owner;

    mapping(string => ProductEvent[]) private productEvents;
    mapping(string => ProductInfo)    private products;
    mapping(address => bool)          public  authorizedActors;

    string[] private allProducts;

    event ProductRegistered(string indexed qrCode, string productName, address registeredBy);
    event EventAdded(string indexed qrCode, EventType eventType, string location, string actor, uint256 timestamp);
    event ActorAuthorized(address indexed actor);
    event ActorRevoked(address indexed actor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action.");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedActors[msg.sender],
            "Not authorized to add events."
        );
        _;
    }

    modifier productMustExist(string memory qrCode) {
        require(products[qrCode].exists, "Product with this QR code does not exist.");
        _;
    }

    /// @param _owner Address of the contract owner
    constructor(address _owner) {
        owner = _owner;
        authorizedActors[_owner] = true;
    }

    /// @notice Register a new product with its QR code
    /// @param qrCode          Unique QR code identifier for the product
    /// @param productName     Human-readable product name
    /// @param originLocation  Where the product was created
    /// @param producerName    Name of the producer
    /// @param eventDate       Unix timestamp of when the production actually happened
    function registerProduct(
        string calldata qrCode,
        string calldata productName,
        string calldata originLocation,
        string calldata producerName,
        uint256         eventDate
    ) external onlyAuthorized {
        require(!products[qrCode].exists,      "Product already registered.");
        require(bytes(qrCode).length > 0,      "QR code can not be empty.");
        require(bytes(productName).length > 0, "Product name can not be empty.");

        products[qrCode] = ProductInfo({
            name:           productName,
            originLocation: originLocation,
            producerName:   producerName,
            exists:         true,
            registeredAt:   block.timestamp
        });

        allProducts.push(qrCode);

        productEvents[qrCode].push(ProductEvent({
            eventType: EventType.PRODUCED,
            location:  originLocation,
            actor:     producerName,
            notes:     string(abi.encodePacked("Product registered: ", productName)),
            timestamp: block.timestamp,
            eventDate: eventDate
        }));

        emit ProductRegistered(qrCode, productName, msg.sender);
        emit EventAdded(qrCode, EventType.PRODUCED, originLocation, producerName, block.timestamp);
    }

    /// @notice Add a new lifecycle event to an existing product
    /// @param qrCode     QR code of the product
    /// @param eventType  Type of event (0=PRODUCED,1=TRANSPORTED,2=STORED,3=DONATED,4=SOLD)
    /// @param location   Where the event took place
    /// @param actor      Who performed the action
    /// @param notes      Additional notes
    /// @param eventDate  Unix timestamp of when the event actually happened
    function addEvent(
        string calldata qrCode,
        EventType       eventType,
        string calldata location,
        string calldata actor,
        string calldata notes,
        uint256         eventDate
    ) external onlyAuthorized productMustExist(qrCode) {
        require(eventType != EventType.PRODUCED, "Use registerProduct for production events.");

        productEvents[qrCode].push(ProductEvent({
            eventType: eventType,
            location:  location,
            actor:     actor,
            notes:     notes,
            timestamp: block.timestamp,
            eventDate: eventDate
        }));

        emit EventAdded(qrCode, eventType, location, actor, block.timestamp);
    }

    /// @notice Authorize a new actor to register products and add events
    /// @param actor Ethereum address to authorize
    function authorizeActor(address actor) external onlyOwner {
        authorizedActors[actor] = true;
        emit ActorAuthorized(actor);
    }

    /// @notice Revoke authorization from an actor
    /// @param actor Ethereum address to revoke
    function revokeActor(address actor) external onlyOwner {
        require(actor != owner, "Can not revoke owner.");
        authorizedActors[actor] = false;
        emit ActorRevoked(actor);
    }

    /// @notice Get basic info about a product
    /// @param qrCode QR code of the product
    function getProductInfo(string calldata qrCode)
        external view productMustExist(qrCode)
        returns (
            string memory name,
            string memory originLocation,
            string memory producerName,
            uint256       registeredAt
        )
    {
        ProductInfo memory p = products[qrCode];
        return (p.name, p.originLocation, p.producerName, p.registeredAt);
    }

    /// @notice Get the complete event history for a product
    /// @param qrCode QR code of the product
    function getFullHistory(string calldata qrCode)
        external view productMustExist(qrCode)
        returns (ProductEvent[] memory)
    {
        return productEvents[qrCode];
    }

    /// @notice Get a single event by index
    /// @param qrCode QR code of the product
    /// @param index  Index of the event (0 = production event)
    function getEvent(string calldata qrCode, uint256 index)
        external view productMustExist(qrCode)
        returns (
            EventType     eventType,
            string memory location,
            string memory actor,
            string memory notes,
            uint256       timestamp,
            uint256       eventDate
        )
    {
        require(index < productEvents[qrCode].length, "Event index out of range.");
        ProductEvent memory e = productEvents[qrCode][index];
        return (e.eventType, e.location, e.actor, e.notes, e.timestamp, e.eventDate);
    }

    /// @notice Get total number of events for a product
    /// @param qrCode QR code of the product
    function getEventCount(string calldata qrCode)
        external view productMustExist(qrCode)
        returns (uint256)
    {
        return productEvents[qrCode].length;
    }

    /// @notice Check if a product is registered
    /// @param qrCode QR code to check
    function isProductRegistered(string calldata qrCode)
        external view returns (bool)
    {
        return products[qrCode].exists;
    }

    /// @notice Get all registered product QR codes
    function getAllProducts() external view returns (string[] memory) {
        return allProducts;
    }

    /// @notice Get total number of registered products
    function getTotalProducts() external view returns (uint256) {
        return allProducts.length;
    }
}
