const exampleData = {
  Number: 14999,
  Issued: Date.parse('2020-10-12') / 1000,
  Due: Date.parse('2020-11-12') / 1000,

  Invoicer: {
    Name: 'Thunderous Applause',
    Street1: '812 Automated Rd',
    Street2: null,
    City: 'New York',
    State: 'NY',
    Zip: '10003',
    Email: 'applause@thunder.com',
    Phone: '+1-800-111-1111',
    Website: 'applause.com',
  },

  Client: {
    Name: 'Monkeys Juggling',
    Street1: '100 Banana St',
    City: 'Bananaberg',
    State: 'NJ',
    Zip: '07048',
  },

  Items: [
    {
      Description: 'Monaco Chain CLASSIC Pave Lock Bracelet',
      Quantity: 3,
      Weight: 35,
      Labor: 12,
      Labor_Gr: 3.5,
      Gold: 105,
      Total: 105,
      Karat: 14,
      options: "16'' / 20.5mm / 14K",
      Img: 'https://monacochain.com/wp-content/uploads/2023/09/1-CLASSIC-PLAIN-PLAIN-LOCK.webp'
    },
    {
      Description: 'Monaco Chain 3+1 Alternate Flex Pave Lock Bracelet',
      Quantity: 17,
      Weight: 30,
      Labor: 12,
      Labor_Gr: 3.5,
      Gold: 105,
      Total: 510,
      Karat: 10,
      options: "10'' / 9.5mm / 10K",
      Img: 'https://monacochain.com/wp-content/uploads/2023/09/2-CLASSIC-PLAIN-PAVE-LOCK.webp'
    },
  ],

  Subtotal: 615,
  Deduction: null,
  Taxes: null,
  Total: 615,
};