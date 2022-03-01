module Jekyll::CustomFilters
  def email_encode(email)
    @token = rand(1..0xff)
    '#%02x%s' % [@token, email.each_byte.map{|n| '%02x' % (n ^ @token)}.join('')]
  end
end

Liquid::Template.register_filter(Jekyll::CustomFilters)
