class Class{
  public public_func() {}
  protected protected_func() {}
  private private_func() {}

  public int public_int_var = 1;   
  protected int protected_int_var = 1;
  private int private_int_var = 1;
};

class SubClass : Class
{
};

enum EngineState
{
  START_UP,
  OFF = 2,
  ON = 4,
  ERROR
};
