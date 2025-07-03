describe('Basic Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to global mocks', () => {
    expect(global.mockUSSDSession).toBeDefined()
    expect(global.mockUserData).toBeDefined()
    expect(global.mockStockAlert).toBeDefined()
  })
})
