import java.sql.*;

// Executa consultas SELECT informadas como argumentos e imprime o resultado em texto.
public class Q {
    public static void main(String[] a) throws Exception {
        // Sem DBP a conexão falharia com erro genérico de autenticação; avisa a causa real.
        if (System.getenv("DBP") == null || System.getenv("DBP").isEmpty()) {
            System.out.println("ERRO: variável DBP (senha) não informada. Solicitar a senha ao usuário.");
            System.exit(1);
        }
        String url = "jdbc:db2://10.250.0.4:50003/" + System.getenv("DBN");
        try (Connection c = DriverManager.getConnection(url, System.getenv("DBU"), System.getenv("DBP"))) {
            c.setReadOnly(true);
            for (String sql : a) {
                System.out.println(">> " + sql);
                try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
                    ResultSetMetaData m = r.getMetaData();
                    int n = m.getColumnCount();
                    StringBuilder h = new StringBuilder();
                    for (int i = 1; i <= n; i++) h.append(m.getColumnLabel(i)).append(" | ");
                    System.out.println(h);
                    while (r.next()) {
                        StringBuilder b = new StringBuilder();
                        for (int i = 1; i <= n; i++) b.append(r.getString(i)).append(" | ");
                        System.out.println(b);
                    }
                } catch (SQLException e) {
                    System.out.println("ERRO: " + e.getMessage());
                }
            }
        }
    }
}
